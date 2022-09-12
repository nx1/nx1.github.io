function myMove(){
    let id = null;
    const box = document.getElementById('animate');
    let boxsize=400; 

    let x = 200;
    let y = 200;

    let dir = 1

    clearInterval(id)
    id = setInterval(frame, 5);
    function frame(){
        x += 3*Math.sin(2*Math.PI*y);
        y += 3*Math.sin(2*Math.PI*x);


        box.style.top = x + "px";
        box.style.left = y + "px";
    }

}
myMove()
