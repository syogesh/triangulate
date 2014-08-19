$(window).load(function() {
    "use strict";
// lets do some fun
    var video = document.getElementById('webcam');
    var canvas = document.getElementById('canvas');
    try {
        var attempts = 0;
        var readyListener = function(event) {
            findVideoSize();
        };
        var findVideoSize = function() {
            if(video.videoWidth > 0 && video.videoHeight > 0) {
                video.removeEventListener('loadeddata', readyListener);
                onDimensionsReady(video.videoWidth, video.videoHeight);
            } else {
                if(attempts < 10) {
                    attempts++;
                    setTimeout(findVideoSize, 200);
                } else {
                    onDimensionsReady(640, 480);
                }
            }
        };
        var onDimensionsReady = function(width, height) {
            demo_app(width, height);
            compatibility.requestAnimationFrame(tick);
        };
        video.addEventListener('loadeddata', readyListener);
        compatibility.getUserMedia({video: true}, function(stream) {
            try {
                video.src = compatibility.URL.createObjectURL(stream);
            } catch (error) {
                video.src = stream;
            }
            setTimeout(function() {
                video.play();
            }, 500);
        }, function (error) {
            $('#canvas').hide();
            $('#log').hide();
            $('#no_rtc').html('<h4>WebRTC not available.</h4>');
            $('#no_rtc').show();
        });
    } catch (error) {
        $('#canvas').hide();
        $('#log').hide();
        $('#no_rtc').html('<h4>Something goes wrong...</h4>');
        $('#no_rtc').show();
    }
    var stat = new profiler();
    var gui,options,ctx,canvasWidth,canvasHeight;
    var img_u8, corners;
    var demo_opt = function(){
        this.lap_thres = 30;
        this.eigen_thres = 25;
    }
    function demo_app(videoWidth, videoHeight) {
        canvasWidth = canvas.width;
        canvasHeight = canvas.height;
        ctx = canvas.getContext('2d');
        ctx.fillStyle = "rgb(0,255,0)";
        ctx.strokeStyle = "rgb(0,255,0)";
        img_u8 = new jsfeat.matrix_t(640, 480, jsfeat.U8_t | jsfeat.C1_t);
        corners = [];
        var i = 640*480;
        while(--i >= 0) {
            corners[i] = new jsfeat.point2d_t(0,0,0,0);
        }
        options = new demo_opt();
        gui = new dat.GUI();
        gui.add(options, "lap_thres", 1, 100);
        gui.add(options, "eigen_thres", 1, 100);
        stat.add("grayscale");
        stat.add("box blur");
        stat.add("yape06");
    }
    function tick() {
        compatibility.requestAnimationFrame(tick);
        stat.new_frame();
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            ctx.drawImage(video, 0, 0, 640, 480);
            var imageData = ctx.getImageData(0, 0, 640, 480);
            stat.start("grayscale");
            jsfeat.imgproc.grayscale(imageData.data, img_u8.data);
            stat.stop("grayscale");
            stat.start("box blur");
            jsfeat.imgproc.box_blur_gray(img_u8, img_u8, 2, 0);
            stat.stop("box blur");
            jsfeat.yape06.laplacian_threshold = options.lap_thres|0;
            jsfeat.yape06.min_eigen_value_threshold = options.eigen_thres|0;
            stat.start("yape06");
            var count = jsfeat.yape06.detect(img_u8, corners);
            stat.stop("yape06");

            // render result back to canvas
            var data_u32 = new Uint32Array(imageData.data.buffer);
            render_corners(corners, count, data_u32, 640);
            ctx.putImageData(imageData, 0, 0);
            $('#log').html(stat.log());
        }
    }
    function render_corners(corners, count, img, step) {
        var pix = (0xff << 24) | (0x00 << 16) | (0xff << 8) | 0x00;
        for(var i=0; i < count; ++i)
        {
            var x = corners[i].x;
            var y = corners[i].y;
            var off = (x + y * step);
            img[off] = pix;
            img[off-1] = pix;
            img[off+1] = pix;
            img[off-step] = pix;
            img[off+step] = pix;
        }
    }
    $(window).unload(function() {
        video.pause();
        video.src=null;
    });
});
