interface SettingsProperties {
    useEquatable: boolean,
    useDeepEquality: boolean,
    useImmutable: boolean,
    useAccurateCopyWith: boolean,
    document: boolean,
    sdkVersion: number,
}

export class Settings implements SettingsProperties {
    readonly useEquatable: boolean = false;
    readonly useDeepEquality: boolean = false;
    readonly useImmutable: boolean = false;
    readonly useAccurateCopyWith: boolean = false;
    readonly document: boolean = false;
    readonly sdkVersion: number = 2.12;

    constructor(settings?: Partial<SettingsProperties>) {
        Object.assign(this, settings);
    }

    copyWith(settings?: Partial<SettingsProperties>): this {
        Object.assign(this, settings);
        return this;
    }
}