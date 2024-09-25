export enum ELogType {
    Info,
    Error,
    Success
}

export interface ILog {
    logType: ELogType;
    message: string;
}
