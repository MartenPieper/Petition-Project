// Static file -> Canvas drawing, setting value of the hidden input field.
(function canvas() {
    var canvas = $("#canvas");
    // var canvas = document.getElementById("canvas");
    var hiddenInput = $("#hiddenInput");
    var button = $("#button");
    let canvasString = "";
    // const ctx = canvas.getContext("2d");
    var ctx = document.getElementById("canvas").getContext("2d");

    console.log("canvas", canvas);

    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "white";

    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    function draw(e) {
        // stop the function if they are not mouse down
        if (!isDrawing) return;
        //listen for mouse move event
        console.log(e);
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(e.offsetX, e.offsetY);
        ctx.stroke();
        [lastX, lastY] = [e.offsetX, e.offsetY];
    }

    canvas.on("mousedown", e => {
        isDrawing = true;
        [lastX, lastY] = [e.offsetX, e.offsetY];
    });

    canvas.on("mousemove", draw);
    canvas.on("mouseup", () => {
        isDrawing = false;
        canvasString = canvas[0].toDataURL();
        hiddenInput.val(canvasString);
        console.log("canvasString: ", canvasString);
    });
    canvas.on("mouseout", () => {
        isDrawing = false;
        canvasString = canvas[0].toDataURL();
        hiddenInput.val(canvasString);
        console.log("canvasString: ", canvasString);
    });
})();
