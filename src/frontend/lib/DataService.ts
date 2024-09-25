import { ELogType, ILog } from "../../common/models";
import { SimpleEventEmitter } from "./SimpleEventEmitter";

class DataService {
    public balanceEmitter = new SimpleEventEmitter<number>();
    public logEmitter = new SimpleEventEmitter<ILog>();
    public betStateEmitter = new SimpleEventEmitter<number>();
    public crashPointsEmitter = new SimpleEventEmitter<number[]>();

    public betEmitter = new SimpleEventEmitter<number>();

    public localError(message: string) {
        this.logEmitter.emit({ logType: ELogType.Error, message });
    }

    public setBalance(data: number) {
        this.balanceEmitter.emit(data)
    }
}
export const dataService = new DataService();
