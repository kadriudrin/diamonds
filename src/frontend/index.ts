import { Application } from 'pixi.js';
import { main } from './main';

const app = new Application();

document.addEventListener('DOMContentLoaded', async () => {
    app.init({
        width: 512,
        height: 512,
        backgroundColor: 0x282832,
        antialias: true,
    }).then(() => {
        const cp = document.getElementById("canvasParent");
        const balance = document.getElementById("balance");
        const betButton = document.getElementById("betButton") as HTMLButtonElement;
        const betInput = document.getElementById("betInput") as HTMLInputElement;
        const snackbar = document.getElementById("snackbar");
        if (!cp || !balance || !betButton || !betInput || !snackbar) return;
        cp.appendChild(app.canvas);
        main(app, balance, betButton, betInput, snackbar);
    });
});
