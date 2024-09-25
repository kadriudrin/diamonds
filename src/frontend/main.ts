import { Application } from "pixi.js"
import { dataService } from "./lib/DataService";
import { ELogType, ILog } from "../common/models";
import { config } from "../common/config";
import { gameLogic } from "./gameLogic";

export async function main(app: Application, balanceElement: HTMLElement, betButton: HTMLButtonElement, betInput: HTMLInputElement, snackbar: HTMLElement) {
    const w = app.canvas.width;
    const h = app.canvas.height;

    // Client side variables
    let balance: number = 100;
    let snackTimeout: number | undefined;
    let betAmount = 0

    // Bet click handler
    betButton.addEventListener('click', () => {
        const parsedAmount = parseFloat(betInput.value);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            dataService.localError('Invalid Input');
            return;
        }
        dataService.betEmitter.emit(parsedAmount);
    });

    // Bet state handler (change bet button visuals)
    dataService.betStateEmitter.register((data: number) => {
        let txt = "Bet";
        let bgClr = "white";
        betAmount = data;
        betButton.innerText = txt;
        betButton.style.background = bgClr;
    });

    // Log handler (using simple snackbar)
    dataService.logEmitter.register((data: ILog) => {
        snackbar.innerText = data.message;
        let bgClr = 'grey';
        if (data.logType === ELogType.Error) bgClr = 'red';
        else if (data.logType === ELogType.Success) bgClr = 'green';
        snackbar.style.visibility = 'visible';
        snackbar.style.backgroundColor = bgClr;

        if (snackTimeout !== undefined) {
            clearTimeout(snackTimeout);
        }
        snackTimeout = window.setTimeout(() => {
            snackbar.style.visibility = 'hidden';
            snackTimeout = undefined;
        }, 2000);
    });

    // Player balance handler
    dataService.balanceEmitter.register((data: number) => {
        balance = data;
        balanceElement.innerText = balance.toFixed(2) + '$';
    });

    gameLogic(app, w, h);
}
