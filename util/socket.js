const io = require('socket.io')({
    pingInterval: 10000,
    pingTimeout: 5000
});

// var Socket = {
//     emit: function(event, data) {
//         console.log(event, data);
//         io.sockets.emit(event, data);
//     }
// };
let userList = [];
let chatHistory = [];
let newJoinFlag = true;
let connected = true;

io.on("connection", (socket) => {

    let user = null;

    console.log("Socket Working !");

    socket.emit('connected', socket.id)

    socket.on("login", (data) => {

        checkUserList(data.uuid)

        connected = true;
        user = data;

        if (newJoinFlag) {
            userList.push(user);
        }
    });

    socket.on('enter', function(data) {
        socket.join(data.trade_number);

        if (newJoinFlag) {
            socket.to(data.trade_number).emit('join', data);
        }

        let findHistory = roomHistory(data.trade_number);
        if (findHistory != null) {
            socket.emit('history', findHistory.list);
        }
    });

    socket.on("send", (data) => {

        let findHistory = roomHistory(data.trade_number);
        if (findHistory == null) {
            //초기 채팅 리스트 푸시
            let historyData = {
                'room': getRoomName(socket),
                'list': [data]
            }
            chatHistory.push(historyData)
        } else {
            findHistory.list.push(data)
        }

        socket.to(getRoomName(socket)).emit('receive', data);
    });

    socket.on('disconnecting', (reason) => {
        connected = false;
        socket.emit('disconnectingUser', connected)
    });

    socket.on('disconnect', (reason) => {
        setTimeout(() => {
            if (!connected && user != null) { //리프레시인지 종료인지 체크
                io.of('/').adapter.clients([user.trade_number], (err, clients) => {

                    if (clients.length == 0) {
                        //해당 방의 클라이언트 수가 0이되면 해당 방의 채팅 리스트를 삭제 후 db 저장 처리 필요
                        let findHistory = roomHistory(user.trade_number);
                        if (findHistory != null) {
                            chatHistory.pop(findHistory)
                        }
                    }

                    socket.to(user.trade_number).emit('disconnectUser', user);
                    socket.leave(user.trade_number);

                    userList.pop(user);
                    user = null;
                    newJoinFlag = true;
                });

            };
        }, 100);

    });

    socket.on('heartbeat', (data) => {
        //console.log('Received Pong: ', data);
    });

});

checkUserList = (uuid) => {
    for (var i = 0; i < userList.length; i++) {
        //접속 시 해당 유저가 refresh로 인한 재 접속인지 처음 접속인지 체크
        if (userList[i].uuid === uuid) {
            newJoinFlag = false;
            break;
        }
    }
}

getRoomName = (socket) => {
    let rooms = Object.keys(socket.rooms).filter((item) => {
        return item !== socket.id;
    });
    return rooms;
}

roomHistory = (roomName) => {
    let findHistory = null;
    for (var i = 0; i < chatHistory.length; i++) {
        if (chatHistory[i].room[0] == roomName) {
            findHistory = chatHistory[i];
            break;
        }
    }
    return findHistory;
}

sendHeartbeat = () => {
    setTimeout(sendHeartbeat, 8000);
    io.sockets.emit('heartbeat', { beat: 1 });
}

sendHeartbeat()

// function clientsCheck(room) {
//     let clients = io.adapter.rooms[room];
//     return Object.keys(clients).length;
// }
//exports.Socket = Socket;
exports.io = io;