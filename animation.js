function myMove() {
    const container = document.getElementById('container');
    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let id = null;
    clearInterval(id);
    id = setInterval(frame, 10);

    const maxBoxes = 50;
    const numBoxes = Math.floor(Math.random() * maxBoxes) + 1;
    const boxes = [];
    const G = 5;
    const minDist = 1;

    for (let i = 0; i < numBoxes; i++) {
        const box = document.createElement('div');

        box.mass = 1 + Math.floor(Math.random() * 10);
        box.x    = Math.floor(Math.random() * window.innerWidth);
        box.y    = Math.floor(Math.random() * window.innerHeight);
        box.vx   = (Math.random() * 2 - 1) * 2;
        box.vy   = (Math.random() * 2 - 1) * 2; 

        box.style.position        = 'absolute';
        box.style.backgroundColor = 'white';
        box.style.left            = box.x + 'px';
        box.style.top             = box.y + 'px';
        box.style.width           = box.mass + 'px';
        box.style.height          = box.mass + 'px';

        // https://stackoverflow.com/questions/1484506/random-color-generator/37281143
        const color = Math.floor(Math.random() * 16777215).toString(16);
        box.style.backgroundColor = '#' + color;

        container.appendChild(box);
        boxes.push(box);
    }

    function frame() {
        for (let i = 0; i < numBoxes; i++) {
            for (let j = i + 1; j < numBoxes; j++) {
                const box1 = boxes[i];
                const box2 = boxes[j];

                const dx    = box2.x - box1.x;
                const dy    = box2.y - box1.y;
                const r     = Math.sqrt(dx ** 2 + dy ** 2);
                const theta = Math.atan2(dy, dx); // https://en.wikipedia.org/wiki/Atan2

                if (r < minDist) continue;

                const F   = -(G * box1.mass * box2.mass) / r ** 2;
                const F_x = F * Math.cos(theta);
                const F_y = F * Math.sin(theta);

                box1.vx += -F_x / box1.mass;
                box1.vy += -F_y / box1.mass;
                box2.vx += F_x / box2.mass;
                box2.vy += F_y / box2.mass;
            }
        }

        for (let i = 0; i < numBoxes; i++) {
            const box = boxes[i];
            box.x += box.vx;
            box.y += box.vy;
            box.style.left = box.x + 'px';
            box.style.top = box.y + 'px';


            // The mass is a proxy for the size of the box
            if (box.x < 0) {
                box.vx = -box.vx;
                box.x = 0;
            }
            if (box.x + box.mass > window.innerWidth) {
                box.vx = -box.vx;
                box.x = window.innerWidth - box.mass;
            }
            if (box.y < 0) {
                box.vy = -box.vy;
                box.y = 0;
            }
            if (box.y + box.mass > window.innerHeight) {
                box.vy = -box.vy;
                box.y = window.innerHeight - box.mass;
            }
        }
    }
}

myMove()
