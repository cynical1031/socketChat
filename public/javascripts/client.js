var SClient = function(user) {

    var myData = user;

    var socket = io('ws://localhost:3000');
    var roomListWrapper = document.querySelector('.roomListWrapper');
    var wrapper = document.querySelector('.chatWrapper');
    var localstorage = window.localStorage;

    if (localstorage.getItem('uuid') == null) {
        localstorage.setItem('uuid', Math.random().toString(24));
        myData.uuid = localstorage.getItem('uuid');
    }

    socket.on('connected', function(data) {
        socket.emit('login', myData);
    });

    socket.emit('roomList');

    var roomList = setInterval(function() {
        socket.emit('roomList'); //현재 등록되어있는 방 요청
    }, 1000);

    socket.on('roomList', function(data) {
        roomListAppend(data); // 방 리스트 방출
    });

    socket.on('makeRoomSucess', function(data) {
        location.href = '/room/' + data.id; //해당 방으로 이동 처리
    });

    socket.on('enterFail', function() {
        alert('입장에 실패했습니다.');
        location.href = '/'; //룸 삭제 또는 비정상적인 방에 입장 시
    });

    socket.on('join', function(data) {
        joinChat(data);
    });

    socket.on('history', function(data) {
        for (var i = 0; i < data.length; i++) {
            appendChat(data[i]); // 리프레시로 인한 재 접속시 현재 대화내용 다시 방출
        }
    });

    socket.on('receive', function(data) {
        appendChat(data); // 메시지 수신 처리
    });

    socket.on('disconnectUser', function(data) {
        leaveChat(data); // 해당 방에 유저가 디스커넥트 시
    });

    socket.on('heartbeat', function(data) {
        //console.log('ping')
        socket.emit('heartbeat', {
            beat: 1
        });
    });

    function roomListAppend(data) {
        console.log(data)
        if (roomListWrapper != undefined) {
            var statement = '';

            data.forEach(function(el) {
                statement += '<li class="roomList" data-room="' + el.id + '"><span>' + el.name + '</span></li>';
            });

            roomListWrapper.innerHTML = statement;
            var roomName = document.querySelectorAll('.roomList')
            for (var i = 0; i < roomName.length; i++) {

                roomName[i].addEventListener('click', function() {
                    var room = this.getAttribute('data-room')
                    location.href = '/room/' + room;
                })
            }
        }

    }

    function makeRoom(data) {
        socket.emit('makeRoom', data); // 방을 만들 때
    }

    function enterRoom(data) {
        clearInterval(roomList);

        myData.roomName = data;
        socket.emit('enter', myData);
    }

    function joinChat(data) {
        var statement = '<li class="infoChat clearFix"><span>' + data.me + '님이 입장하였습니다.</span></li>';
        wrapper.insertAdjacentHTML('beforeend', statement);
    }

    function leaveChat(data) {
        var statement = '<li class="infoChat clearFix"><span>' + data.me + '님이 퇴장하였습니다.</span></li>';
        wrapper.insertAdjacentHTML('beforeend', statement);
    }

    function sendChat(el) {
        myData.msg = el.value;
        el.value = '';
        socket.emit('send', myData);
        appendChat(myData);
    }

    function appendChat(data) {

        var statement = '<li class="clearFix">'
        switch (data.uuid != myData.uuid) { //전달 받은 uuid 체크 후 나인지 상대방인지 체크
            case true:
                statement += '<div class="another">';
                statement += '<span>상대방 : <span><span>' + data.msg + '</span>';
                statement += '</div>';
                break;
            case false:
                statement += '<div class="me">';
                statement += '<span>나 : <span><span>' + data.msg + '</span>';
                statement += '</div>';
                break;
        }

        statement += '</li>';
        wrapper.insertAdjacentHTML('beforeend', statement);
    }

    return {
        make: function(data) {
            makeRoom(data);
        },
        join: function(data) {
            location.href = '/room/' + data;
        },
        enter: function(data) {
            enterRoom(data);
        },
        send: function(data) {
            sendChat(data);
        }
    }
};