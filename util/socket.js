const io = require('socket.io')({
    pingInterval: 10000,
    pingTimeout: 5000
});

let roomList = [];
let userList = [];
let chatHistory = [];
let newJoinFlag = true;
let connected = true;
let refreshCounter = 0;
io.on("connection", (socket) => {

    let user = null;

    console.log("Socket Working !");

    socket.emit('connected', socket.id);

    socket.on("login", (data) => { //소켓 최초 진입 시

        connected = true;
        user = data;

        checkUserList(data.uuid); //현재 유저가 리프레시인지 다시 접속인지 체크

        if (newJoinFlag) {
            userList.push(user);
        }
    });

    socket.on('roomList', function() { // 현재 등록 되어있는 방 송출
        socket.emit('roomList', roomList)
    });

    socket.on('makeRoom', function(data) { //새로운 방 등록
        let newRoom = {
            'id': Math.random().toString(24),
            'name': data,
            'userList': [user]
        }
        roomList.push(newRoom);
        socket.emit('makeRoomSucess', newRoom);
    });

    socket.on('enter', function(data) { // 방 입장
        let room = getRoomElement(data.roomName)
        if (room != null) {
            socket.join(room.id);

            let newRoomJoinFlag = roomJoinCheck(room, data);

            if (!newRoomJoinFlag) {
                socket.to(room.id).emit('join', data);
            }
            let findHistory = roomHistory(room.id);
            if (findHistory != null) {
                socket.emit('history', findHistory.list);
            }
        } else {
            socket.emit('enterFail')
        }
    });

    socket.on("send", (data) => { //채팅 전달
        let findHistory = roomHistory(data.roomName);
        if (findHistory == null) {
            let historyData = { //초기 채팅 리스트 푸시
                'room': getRoomName(socket),
                'list': [data]
            }
            chatHistory.push(historyData); // 현재 방의 채팅 내용 로그
        } else {
            findHistory.list.push(data);
        }

        socket.to(getRoomName(socket)).emit('receive', data);
    });

    socket.on('disconnecting', (reason) => {
        connected = false;
    });

    socket.on('disconnect', (reason) => {
        setTimeout(() => {
            if (!connected && user != null) { //리프레시인지 종료인지 체크
                let room = getRoomElement(user.roomName) // 현재 소켓의 방 체크
                io.in(user.roomName).clients((err, clients) => {
                    if (clients.length == 0) {
                        //해당 방의 클라이언트 수가 0이되면 해당 방의 채팅 리스트를 삭제 후 db 저장 처리 필요

                        let findHistory = roomHistory(user.roomName);
                        if (room != null) { // 룸 리스트에서 방 삭제
                            roomList.pop(room)
                        }
                        if (findHistory != null) {
                            chatHistory.pop(findHistory); //현재 방의 채팅 로그 삭제
                        }
                    }

                    socket.to(user.roomName).emit('disconnectUser', user); // 해당 방의 유저에게 디스커넥트 전달
                    socket.leave(user.roomName); //최종 방 나감 처리

                    userList.pop(user);
                    if (room != null) {
                        room.userList.pop(user) //현재 방리스트에서 소켓 삭제
                    }

                    user = null;
                    newJoinFlag = true;
                });

            };
        }, 1000);

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

getRoomElement = (roomName) => {
    //룸 찾기
    let room = null;
    for (var i = 0; i < roomList.length; i++) {
        if (roomList[i].id == roomName) {
            room = roomList[i];
            break;
        }
    }
    return room;
}

roomJoinCheck = (room, data) => {
    //방의 접속체크(리프레시 후 방에 다시 들어올때)
    let flag = false;
    for (var i = 0; i < room.userList.length; i++) {
        if (room.userList[i].uuid == data.uuid) {
            flag = true;
            break;
        }
    }
    if (!flag) {
        room.userList.push(data)
    }
    return flag
}

getRoomName = (socket) => {
    //현재 소켓의 속해 있는 방 가져오기
    let rooms = Object.keys(socket.rooms).filter((item) => {
        return item !== socket.id;
    });
    return rooms;
}

roomHistory = (roomName) => {
    // 방의 채팅 로그 가져오기
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
    //ping pong
    setTimeout(sendHeartbeat, 8000);
    io.sockets.emit('heartbeat', { beat: 1 });
}

sendHeartbeat()

exports.io = io;