namespace DrawBetter

open System
open System.Threading.Tasks
open System.Collections.Generic
open Microsoft.AspNetCore.Builder
open Microsoft.AspNetCore.Http
open Microsoft.Extensions.DependencyInjection
open System.Text.Json
open Microsoft.AspNetCore.Routing
open Shared

module Program =

    let assignToRoom (ctx: HttpContext) =
        let existingRoom =
            Shared.State.rooms.Values
            |> Seq.tryFind (fun r -> r.Players.Count < 2)

        let room =
            match existingRoom with
            | Some r -> r
            | None ->
                let newRoom = Shared.State.createRoom()
                printfn $"Room {newRoom.Id} has opened. Code: {newRoom.Code}"
                newRoom

        let playerId = System.Guid.NewGuid().ToString()
        room.Players.TryAdd(playerId, ctx) |> ignore
        Shared.State.playerToRoom.TryAdd(playerId, room.Id) |> ignore

        {| playerId = playerId; roomId = room.Id; isFirst = room.Players.Count = 1; roomCode = room.Code |}

    [<EntryPoint>]
    let main args =
        let builder = WebApplication.CreateBuilder(args)
        builder.Services.AddRouting() |> ignore
        let app = builder.Build()

        app.UseStaticFiles() |> ignore
        app.UseRouting()
           .UseEndpoints(fun endpoints ->

               endpoints.MapPost("/api/join", Func<HttpContext, Task>(fun ctx ->
                   task {
                       let result = assignToRoom ctx
                       do! ctx.Response.WriteAsJsonAsync(result)
                   })) |> ignore

               endpoints.MapPost("/api/setup", Func<HttpContext, Task>(fun ctx ->
                    task {
                        let! body = ctx.Request.ReadFromJsonAsync<Dictionary<string, JsonElement>>()

                        match body.TryGetValue("playerId"), body.TryGetValue("word"), body.TryGetValue("timeLimitSeconds") with
                        | (true, pidElem), (true, wordElem), (true, timeElem) ->
                            let playerId = pidElem.GetString()
                            let word = wordElem.GetString()
                            let time = timeElem.GetInt32()

                            printfn $"[INFO] The word is: {word}"
                            printfn $"[INFO] The time is set for: {time} seconds"

                            if String.IsNullOrWhiteSpace(playerId) then
                                ctx.Response.StatusCode <- 400
                                return! ctx.Response.WriteAsync("playerId is missing.")
                            elif String.IsNullOrWhiteSpace(word) then
                                ctx.Response.StatusCode <- 400
                                return! ctx.Response.WriteAsync("The word is missing.")
                            elif time <= 0 then
                                ctx.Response.StatusCode <- 400
                                return! ctx.Response.WriteAsync("The time is must be positive.")
                            else
                                match State.playerToRoom.TryGetValue(playerId) with
                                | true, roomId ->
                                    let room = State.rooms.[roomId]
                                    room.Setup <- Some { Word = word; TimeLimitSeconds = time }
                                    return! ctx.Response.WriteAsync("Setup OK")
                                | false, _ ->
                                    ctx.Response.StatusCode <- 400
                                    return! ctx.Response.WriteAsync("Unknown playerId.")

                        | _ -> ctx.Response.StatusCode <- 400
                        return! ctx.Response.WriteAsync("Missing or incorrect fields in the setup request.")
                    })) |> ignore

               endpoints.MapGet("/api/hassetup/{playerId}", Func<HttpContext, Task>(fun ctx ->
                    task {
                        let id = ctx.Request.RouteValues["playerId"].ToString()
                        match State.playerToRoom.TryGetValue(id) with
                        | true, roomId ->
                            let room = State.rooms.[roomId]
                            do! ctx.Response.WriteAsJsonAsync(room.Setup.IsSome)
                        | false, _ ->
                            ctx.Response.StatusCode <- 400
                            do! ctx.Response.WriteAsync("Unknown playerId.")
                    })) |> ignore

               endpoints.MapGet("/api/canstart/{playerId}", Func<HttpContext, Task>(fun ctx ->
                    task {
                        let id = ctx.Request.RouteValues["playerId"].ToString()
                        match State.playerToRoom.TryGetValue(id) with
                        | true, roomId ->
                            let room = State.rooms.[roomId]
                            let ready = room.Players.Count = 2 && room.Setup.IsSome

                            if ready && room.StartTime.IsNone then
                                room.StartTime <- Some DateTime.UtcNow
                                printfn $"[INFO] Room ({room.Id}) gametime is started: {room.StartTime.Value}"

                            do! ctx.Response.WriteAsJsonAsync(ready)
                        | false, _ ->
                            ctx.Response.StatusCode <- 400
                            do! ctx.Response.WriteAsync("Unknown playerId.")
                    })) |> ignore

               endpoints.MapGet("/api/gametime/{playerId}", Func<HttpContext, Task>(fun ctx ->
                   task {
                       let id = ctx.Request.RouteValues["playerId"].ToString()
                       match State.playerToRoom.TryGetValue(id) with
                       | true, roomId ->
                           let room = State.rooms.[roomId]
                           match room.Setup, room.StartTime with
                           | Some setup, Some start ->
                               do! ctx.Response.WriteAsJsonAsync({| start = start; duration = setup.TimeLimitSeconds; word = setup.Word |})
                           | _ -> ctx.Response.StatusCode <- 204
                       | _ -> ctx.Response.StatusCode <- 400
                   })) |> ignore

               endpoints.MapPost("/api/submit", Func<HttpContext, Task>(fun ctx ->
                    task {
                        let! sub = ctx.Request.ReadFromJsonAsync<DrawingSubmission>()
                        match State.playerToRoom.TryGetValue(sub.PlayerId) with
                        | true, roomId ->
                            let room = State.rooms.[roomId]
                            room.Submissions.TryAdd(sub.PlayerId, sub) |> ignore
                            printfn $"[SUBMIT] Room: {roomId} - The draw was successfully submitted by: {sub.PlayerId} ({room.Submissions.Count}/2)"

                            if room.Submissions.Count = 2 then
                                printfn $"[EVAL] Evaluation starts in the room: {roomId}"
                                do! GameLogic.evaluateRoom room

                            do! ctx.Response.WriteAsync("OK")
                        | _ ->
                            ctx.Response.StatusCode <- 400
                            printfn $"[SUBMIT] Unknown playerId: {sub.PlayerId}"
                    })) |> ignore

               endpoints.MapGet("/api/result/{playerId}", Func<HttpContext, Task>(fun ctx ->
                    task {
                        match ctx.Request.RouteValues.TryGetValue("playerId") with
                        | true, value when value <> null ->
                            let id = value.ToString()
                            match State.playerToRoom.TryGetValue(id) with
                            | true, roomId ->
                                let room = State.rooms.[roomId]
                                match room.Results.TryGetValue(id) with
                                | true, res ->
                                    let resultObj = 
                                        {| result = res.ToString()
                                           labels = room.Labels
                                           images = room.Images |}
                                    do! ctx.Response.WriteAsJsonAsync(resultObj)
                                | _ ->
                                    ctx.Response.StatusCode <- 204
                            | _ ->
                                ctx.Response.StatusCode <- 404
                        | _ ->
                            ctx.Response.StatusCode <- 400
                            do! ctx.Response.WriteAsync("Missing or invalid player ID")
                    })) |> ignore
           ) |> ignore

        app.Run()
        0
