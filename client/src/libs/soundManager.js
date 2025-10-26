module.exports.obj = function (config, UTILS) {

    var tmpSound;
    this.sounds = [];
    this.active = true;

    this.play = function (id, volume, loop) {
        if (!volume || !this.active) return;
        tmpSound = this.sounds[id];
        if (!tmpSound) {
            tmpSound = new Howl({
                src: ".././sound/" + id + ".mp3"
            });
            this.sounds[id] = tmpSound;
        }
        if (!loop || !tmpSound.isPlaying) {
            tmpSound.isPlaying = true;
            tmpSound.play();
            tmpSound.volume((volume || 1) * config.volumeMult);
            tmpSound.loop(loop);
        }
    };

    this.toggleMute = function (id, mute) {
        tmpSound = this.sounds[id];
        if (tmpSound) tmpSound.mute(mute);
    };

    this.stop = function (id) {
        tmpSound = this.sounds[id];
        if (tmpSound) {
            tmpSound.stop();
            tmpSound.isPlaying = false;
        }
    };

};