interface SettingsProperties {
    equatable: boolean,
    immutable: boolean,
    document: boolean,
    sdkVersion: number,
}

export class Settings implements SettingsProperties {
    equatable = false;
    immutable = false;
    document = false;
    sdkVersion = 2.12;

    constructor(settings?: Partial<SettingsProperties>) {
        Object.assign(this, settings);
    }
}