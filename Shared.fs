namespace Shared

open System
open Microsoft.AspNetCore.Http
open System.Collections.Concurrent

type GameSetup = {
    Word: string
    TimeLimitSeconds: int
}

type DrawingSubmission = {
    PlayerId: string
    ImageBase64: string
}

type GameResult =
    | YouWin
    | YouLose

type Room = {
    Id: string
    Code: int
    mutable Setup: GameSetup option
    Players: ConcurrentDictionary<string, HttpContext>
    Submissions: ConcurrentDictionary<string, DrawingSubmission>
    mutable StartTime: System.DateTime option
    Results: ConcurrentDictionary<string, GameResult>
    Labels: ConcurrentDictionary<string, string list>
    Images: ConcurrentDictionary<string, string>
}

module State =
    let rooms = ConcurrentDictionary<string, Room>()
    let playerToRoom = ConcurrentDictionary<string, string>()

    let rnd = Random()

    let generateRoomCode () =
        rnd.Next(10000, 99999)

    let createRoom () =
        let roomId = $"room-{rooms.Count + 1}"
        let room = {
            Id = roomId
            Code = generateRoomCode()
            Setup = None
            Players = ConcurrentDictionary()
            Submissions = ConcurrentDictionary()
            StartTime = None
            Results = ConcurrentDictionary()
            Labels = ConcurrentDictionary()
            Images = ConcurrentDictionary()
        }
        rooms.TryAdd(roomId, room) |> ignore
        room