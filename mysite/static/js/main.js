console.log('IN main.js')

var mapPeers = {};

var usernameInput = document.querySelector('#username-input')
var btnJoin = document.querySelector('#btn-join')

var username;

var webSocket;


function webSocketOnMessage(event) {
    var parseData = JSON.parse(event.data);

    var peerUsername = parseData['peer'];
    var action = parseData['action'];
    
    console.log(action);

    if(username == peerUsername){
        console.log("username == peerUsername");
        console.log(parseData);
        console.log(parseData['peer']);     
        console.log(parseData['action']);
        console.log(parseData['message']['receiver_channel_name']);
        return ;
    }


    var receiver_channel_name = parseData['message']['receiver_channel_name'];

    
    console.log(receiver_channel_name);
    if(action == 'new-peer'){
        console.log("action new-peer")
        createOfferer(peerUsername,receiver_channel_name);
        return
    }

    if(action == 'new-offer'){
        var offer = parseData['message']['sdp'];
        createAnswerer(offer,peerUsername,receiver_channel_name);
        return
    }
    
    if(action == 'new-answer'){
        var answer  = parseData['message']['sdp'];
        var peer = mapPeers[peerUsername][0];
        peer.setRemoteDescription(answer);

        return;
    }
}





btnJoin.addEventListener('click', ()=> {
    username = usernameInput.value;
    console.log("username",username)

    if(username == '')
    {
        return;
    }

    usernameInput.value = '';
    usernameInput.disabled = true;
    usernameInput.style.visibility = 'hidden';

    
    btnJoin.disabled = true;
    btnJoin.style.visibility = 'hidden';


    var labelUsername = document.querySelector('#label-username')
    labelUsername.innerHTML = username;


        var loc = window.location;
        var wsStart = 'ws://';

        if(loc.protocol == 'https:'){
            wsStart = 'wss://'
        }

    var endPoint = wsStart + loc.host.slice(0,loc.host.length-1)+1 + loc.pathname

    console.log("a",endPoint);

    webSocket = new WebSocket(endPoint);
    
    webSocket.addEventListener('open',(e) => {
        console.log("Connection Opend");
        sendSignal('new-peer',{});
    });



    webSocket.addEventListener('message',webSocketOnMessage);
    
    console.log("message");
    webSocket.addEventListener('close',(e) => {
        console.log("Connection Close")
    });
    webSocket.addEventListener('error',(e) => {
        console.log("Connection Error")
    });

});

var localStream = new MediaStream();

const constraints = {
    'video':true,
    'audio':true,
};

const localVideo = document.querySelector('#local-video')
const btnToggleVideo = document.querySelector('#btn-toggle-video')
const btnToggleAudio = document.querySelector('#btn-toggle-audio')
const capture = document.querySelector('#preprocess')

let width = 300, height = 225;

capture.addEventListener('click', ()=>{
    var a = 0;
    preprocess();
});

function successCallback(stream) {
    console.log('successCallback')
    localVideo.width = 300; localVideo.height = 225;//prevent Opencv.js error.
    localVideo.srcObject = stream;
    // video.play();
}

function errorCallback(error) {
    console.log(error);
    console.log("errorCallback");
}

var userMedia = navigator.getUserMedia(constraints,successCallback,errorCallback)
    .then(
        stream=>{
            localStream = stream;
            localVideo.srcObject = localStream;
            localVideo.muted = true;

            var audioTracks = stream.getAudioTracks();
            var videoTracks = stream.getVideoTracks();

            audioTracks[0].enabled = true;
            videoTracks[0].enabled = true;

            btnToggleAudio.addEventListener('click', () => {

                audioTracks[0].enabled = !audioTracks[0].enabled;
                if(audioTracks[0].enabled){
                    btnToggleAudio.innerHTML = 'Audio Mute';
                    return;
                }
                btnToggleAudio.innerHTML = 'Audio UnMute';
                

            });
            btnToggleVideo.addEventListener('click', () => {

                videoTracks[0].enabled = !videoTracks[0].enabled;
                if(videoTracks[0].enabled){
                    btnToggleVideo.innerHTML = 'Video off';
                    return;
                }
                btnToggleVideo.innerHTML = 'Video on';
                

            });

        }
    )
    .catch(error => {
        console.log('Error accessing media devices', error);
    });


function preprocess(){


    var cap = new cv.VideoCapture('local-video');
    let src = new cv.Mat(225,300, cv.CV_8UC4);
    cap.read(src);
    var dict={};
    var size = 100000;
    for (let index = 0; index < src["data"].length; index+=size) {
        const element = src["data"].slice(index,index+size);
        dict[''+index] = btoa(element);
    }
    console.log(dict);
    return dict
}
function sendSignal(action,message){
    
    var jsonStr = JSON.stringify({
        'peer' : username,
        'action': action,
        'message' : message,
    });
    
    console.log(jsonStr)
    webSocket.send(jsonStr);
};


function createOfferer(peerUsername,receiver_channel_name){
    var peer = new RTCPeerConnection(null);

    addLocalTracks(peer);
    
    var dc = peer.createDataChannel('channel');
    console.log('open????')

    dc.addEventListener('open',()=>{
        console.log('Connection Opened');
    });
    dc.addEventListener('message',dcOnMessage);

    var remoteVideo = createVideo(peerUsername);
    setOnTrack(peer, remoteVideo);

    mapPeers[peerUsername] = [peer, dc];

    peer.addEventListener('iceconnectionstatechange', ()=>{
        var iceConnectionState = peer.iceConnectionState;

        if(iceConnectionState === 'failed' || iceConnectionState === 'disconnected' || iceConnectionState === 'closed'){
            delete mapPeers[peerUsername];

            if(iceConnectionState != 'closed'){
                peer.close();
            }
            removeVideo(remoteVideo);
        }
    })

    peer.addEventListener('icecandidate', (event)=>{
        if(event.candidate){
            console.log("new Ice candidate", JSON.stringify(peer.localDescription));
            return;
        }

        sendSignal('new-offer',{
            'sdp':peer.localDescription,
            'receiver_channel_name' : receiver_channel_name
        });
    });
    peer.createOffer()
    .then(o => peer.setLocalDescription(o))
    .then(() => {
        console.log('Local description set successfully');
    })

}

function createAnswerer(offer,peerUsername,receiver_channel_name){
    var peer = new RTCPeerConnection(null);

    addLocalTracks(peer);
    
    var remoteVideo = createVideo(peerUsername);
    setOnTrack(peer, remoteVideo);

    peer.addEventListener('datachannel',e=> {
        peer.dc= e.channel;
        peer.dc.addEventListener('open',()=>{
            console.log('Connection Opened');
        });
        peer.dc.addEventListener('message',dcOnMessage);        
        mapPeers[peerUsername] = [peer, peer.dc];
    })




    peer.addEventListener('iceconnectionstatechange', ()=>{
        var iceConnectionState = peer.iceConnectionState;

        if(iceConnectionState === 'failed' || iceConnectionState === 'disconnected' || iceConnectionState === 'closed'){
            delete mapPeers[peerUsername];

            if(iceConnectionState != 'closed'){
                peer.close();
            }
            removeVideo(remoteVideo);
        }
    })

    peer.addEventListener('icecandidate', (event)=>{
        if(event.candidate){
            console.log("new Ice candidate", JSON.stringify(peer.localDescription));
            return;
        }

        sendSignal('new-answer',{
            'sdp':peer.localDescription,
            'receiver_channel_name' : receiver_channel_name
        });
    });

    peer.setRemoteDescription(offer)
    .then(() => {
        console.log('Remote description set successfully for %s', peerUsername);
        return peer.createAnswer();

    })
    .then(a=> {
        console.log('Answer created');
        peer.setLocalDescription(a);
    })
}


function addLocalTracks(peer){
    localStream.getTracks().forEach(track => {
        peer.addTrack(track, localStream);
    })
    return;
}

var messageList = document.querySelector('#message-list');
function dcOnMessage(event){
    var message = event.data;

    console.log('dconmessage');
    var li = document.createElement('li');
    li.appendChild(document.createTextNode(message));
    messageList.appendChild(li);
}

function createVideo(peerUsername){
    var videoContainer = document.querySelector('#video-container');

    var remoteVideo = document.createElement('video');

    console.log('createVideo')
    remoteVideo.id = peerUsername + '-video';
    remoteVideo.autoplay = true;
    remoteVideo.playsInline = true;
    
    var videoWrapper = document.createElement('div');

    videoContainer.appendChild(videoWrapper);
    videoWrapper.appendChild(remoteVideo);

    return remoteVideo;

}

function setOnTrack(peer,remoteVideo){
    var remoteStream = new MediaStream();

    remoteVideo.srcObject = remoteStream;

    peer.addEventListener('track', async (event) =>{
        remoteStream.addTrack(event.track, remoteStream)
    });

}

function removeVideo(video){
    var videoWrapper = video.parentNode;
    videoWrapper.parantNode.removeChild(videoWrapper);

}