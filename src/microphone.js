Microphone = class Microphone {
    constructor(options) {
        this.audioCtx = options.audioContext;
        this.audioResource = null;
        this.intermediateNode = null;
        this.bufferSize = options.bufferSize || 512;

        this.userOnSuccess = options.onSuccess;
        this.userOnReject = options.onReject;
        this.onNoSource = options.onNoSource;
        this.onNoSignal = options.onNoSignal;
        this.onAudioData = options.onAudioData;

        this.micCheckDuration = 500; // number of audio frames to process
        this.micCheckCounter = 0;
        this.audioFrameSum = 0;

        // create scriptProcessor node which executes onAudioData handler and does micCheck
        this.intermediateNode = this.audioCtx.createScriptProcessor(this.bufferSize, 1, 1);
        this.intermediateNode.onaudioprocess = this._onAudioProcess.bind(this);

        this.start();
    }

    _onAudioProcess(e) {
        var nodeInput = e.inputBuffer.getChannelData(0);
        var nodeOutput = e.outputBuffer.getChannelData(0);

        //check if there is any signal during the first audio frames
        if (this.micCheckCounter < this.micCheckDuration) {
            this.micCheck(nodeInput);
        }

        //execute processAudioData function (just for the first (left) channel right now)
        if (this.onAudioData) {
            this.onAudioData(nodeInput);
        }

        //set node output
        nodeOutput.set(nodeInput);
    }


    connect(webaudioNode) {
        try {
            this.intermediateNode.connect(webaudioNode);
        } catch (e) {
            console.error(e);
        }
    }

    start() {
        // check for getUserMedia
        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) || navigator.msGetUserMedia;
        if (!navigator.getUserMedia) {
            console.warn('No microphone source was detected, please switch to another browser.');
            try {
                this.onNoSource();
                return;
            } catch (e) {
                console.error('An error occured during execution of onNoSource(): ', e);
            }
        }

        // create HTML5 Audio resource 
        this.audioResource = new HTML5Audio(() => {
            this.audioResource.sourceNode.connect(this.intermediateNode);
            this.userOnSuccess();
        }, this.userOnReject, this.audioCtx);

    }

    micCheck(audioFrame) {
        this.micCheckCounter++;
        for (var i = audioFrame.length - 1; i >= 0; i--) {
            let sampleAbs = Math.abs(audioFrame[i]);
            if (isNaN(sampleAbs)) return;
            this.audioFrameSum += sampleAbs;
        };
        if (this.micCheckCounter == this.micCheckDuration) {
            if (this.audioFrameSum < 0.01) {
                console.warn('No signal from microphone detected, check your operating systems audio settings.');
                try {
                    this.onNoSignal();
                } catch (e) {
                    console.error('Error during execution of onNoSignal(): ', e);
                }
            }
        }
    }

    stop() {
        if (this.audioResource) {
            // stops microphone input entirely
            this.audioResource.disable();
        }
    }
}
