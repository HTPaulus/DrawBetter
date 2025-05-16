module GameLogic

open System
open System.Net.Http
open System.Text.Json
open System.Threading.Tasks
open Shared
open System.IO

let visionApiKey = System.IO.File.ReadAllText("api_key.txt").Trim()
let visionEndpoint = $"https://vision.googleapis.com/v1/images:annotate?key={visionApiKey}"

let saveImage (base64: string) (fileName: string) =
    let bytes = Convert.FromBase64String(base64)
    let path = Path.Combine("saved-images", fileName)
    Directory.CreateDirectory("saved-images") |> ignore
    File.WriteAllBytes(path, bytes)

type VisionResult = {
    Labels: string list
    Texts: string list
}

type EvaluationResult =
    { PlayerId: string
      ImageBase64: string
      Labels: string list
      Matches: int
      IsWinner: bool }

let extractVisionInfo (base64Image: string) : Task<VisionResult> =
    task {
        use client = new HttpClient()

        let jsonBody = $"""
        {{
          "requests": [
            {{
              "image": {{
                "content": "{base64Image}"
              }},
              "features": [
                {{ "type": "LABEL_DETECTION" }},
                {{ "type": "TEXT_DETECTION" }}
              ]
            }}
          ]
        }}
        """

        let content = new StringContent(jsonBody, System.Text.Encoding.UTF8, "application/json")
        let! response = client.PostAsync(visionEndpoint, content)
        let! body = response.Content.ReadAsStringAsync()
        try
            let doc = JsonDocument.Parse(body)
            let root = doc.RootElement.GetProperty("responses").[0]

            let labels =
                match root.TryGetProperty("labelAnnotations") with
                | true, la -> la.EnumerateArray() |> Seq.choose (fun x ->
                    match x.TryGetProperty("description") with
                    | true, d -> Option.ofObj (d.GetString())
                    | _ -> None)
                | _ -> Seq.empty

            let texts =
                match root.TryGetProperty("textAnnotations") with
                | true, ta -> ta.EnumerateArray() |> Seq.choose (fun x ->
                    match x.TryGetProperty("description") with
                    | true, d -> Option.ofObj (d.GetString())
                    | _ -> None)
                | _ -> Seq.empty

            return { Labels = Seq.toList labels; Texts = Seq.toList texts }
        with ex ->
            printfn $"[Vision API error] {ex.Message}"
            return { Labels = []; Texts = [] }
    }

let evaluateRoom (room: Room) =
    task {
        match room.Setup with
        | None -> ()
        | Some setup ->
            printfn $"[EVAL] Word: {setup.Word}"

            let! results =
                room.Submissions.Values
                |> Seq.map (fun s -> task {
                    saveImage s.ImageBase64 $"{s.PlayerId}.png"

                    let! vision = extractVisionInfo s.ImageBase64

                    let word = setup.Word.ToLower()

                    let forbiddenTexts =
                        vision.Texts
                        |> List.map (fun t -> t.Trim().ToLower())
                        |> List.filter (fun t ->
                            //let target = setup.Word.ToLower()
                            //t.Length >= target.Length / 2 && target.StartsWith(t)
                            let target = t.ToLower()
                            target = word || t.Length >= 3
                        )

                    if forbiddenTexts.Length > 0 then
                        printfn $"""[DISQUALIFIED] {s.PlayerId} - Suspicious text detected: {String.Join(" | ", forbiddenTexts)}"""
                        room.Labels.[s.PlayerId] <- ["Cheater!"]
                        room.Images.[s.PlayerId] <- s.ImageBase64
                        return (s.PlayerId, -1)
                    else
                        let matches =
                            vision.Labels
                            |> List.filter (fun l -> l.ToLower().Contains(word))

                        printfn $"""[MATCH] {s.PlayerId} → {List.length matches} Match: {String.Join(", ", matches)}"""
                        room.Labels.[s.PlayerId] <- vision.Labels
                        room.Images.[s.PlayerId] <- s.ImageBase64
                        return (s.PlayerId, List.length matches)
                })
                |> Task.WhenAll

            let sorted = results |> Array.sortByDescending snd
            let winner = sorted.[0].Item1
            printfn $"[WINNER] {winner}"

            for (pid, score) in results do
                let outcome = if score >= 0 && pid = winner then YouWin else YouLose
                room.Results.[pid] <- outcome
                printfn $"[RESULT] {pid} => {outcome}"
    }