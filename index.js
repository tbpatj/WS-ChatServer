let express = require("express");
let app = express();
const cors = require("cors");
let fs = require("fs");
let prompt = require("prompt");
const { exit } = require("node:process");

let whitelist = ["http://localhost:3000"];
let corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
};

app.use(cors());
// var expressWs = require('express-ws')(app);
let http = require("http").createServer(app);
let io = require("socket.io")(http, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

let uuidv4 = require("uuid").v4;

const PORT = 8000 || process.env.PORT;
let rooms = {};
let chatLogs = {};
//load up the data from the json file, kinda jank right now lol
function loadData() {
  try {
    let rawdata = fs.readFileSync("serverDB.json");
    let myData = JSON.parse(rawdata);
    if (myData.rooms) {
      rooms = myData.rooms;
    }
    if (myData.chatLogs) {
      chatLogs = myData.chatLogs;
    }
  } catch (error) {
    console.log(error);
  }
}
loadData();

app.get("/room", function (req, res, next) {
  console.log("creating room");
  const room = {
    name: req.query.name,
    id: uuidv4(),
  };
  rooms[room.id] = room;
  chatLogs[room.id] = [];
  res.json(room);
});

app.get("/rooms", function (req, res, next) {
  console.log("sending rooms back");
  res.json(rooms);
});

app.get("/room/:roomId", function (req, res, next) {
  const roomId = req.params.roomId;
  const response = {
    ...rooms[roomId],
    chats: chatLogs[roomId],
  };
  console.log("roomID: " + roomId + "chat " + JSON.stringify(response));
  res.json(response);
});

// app.ws('/', function (ws, req) {
// 	console.log("socket")
// 	ws.on('connection', function(socket){
// 		console.log("conect")
// 	})
// 	ws.on('essage', function (msg) {
// 		console.log(msg);
// 	});
// });

// app.listen(5000);

io.on("connection", function (socket) {
  socket.on("event://send-message", function (msg) {
    console.log("got", msg);
    const payload = JSON.parse(msg);
    if (chatLogs[payload.roomId]) {
      chatLogs[payload.roomId].push(payload.data);
    }

    socket.broadcast.emit("event://get-message", msg);
  });
});

http.listen(PORT, function () {
  console.log(`listening on *:${PORT}`);
});

//save the data
setInterval(() => {
  console.log("saving data");
  let data = { rooms, chatLogs };
  data = JSON.stringify(data);

  fs.writeFile("serverDB.json", data, "utf8", (err) => console.log(err));
}, 100000);
