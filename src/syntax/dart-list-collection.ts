import { Parameter } from '../models/parameter';
import { buildString, StringBuffer } from '../utils/string-buffer';

export class DartListCollection {
    private readonly sb = new StringBuffer();
    readonly null: string;
    readonly length: number;

    constructor(readonly param: Parameter) {
        this.length = param.type.split('<').filter((e) => e === 'List').length;
        this.null = param.isNullable || !param.isNullable && param.hasDefault ? '?' : '';
    }

    writeAsListDynamicMapEntry() {
        this.sb.writeln(`${this.param.name}: (map['${this.param.mapKey}'] as List<dynamic>${this.null})`, 4);
    }

    toList(cb: (param: Parameter) => string) {
        for (let i = 1; i < this.length; i++) {
            switch (i) {
                case 1:
                    this.sb.writeln(`${this.null}.map((e) => (e as List<dynamic>)`, 4 + i * 2);
                    break;
                default:
                    this.sb.writeln('.map((e) => (e as List<dynamic>)', 4 + i * 2);
            }
        }

        const nullable = this.length === 1 ? this.null : '';
        this.sb.writeln(`${nullable}.map((e) => ${cb(this.param)})`, 4 * this.length);

        for (let i = this.length; i > 0; i--) {
            switch (i) {
                case 1:
                    this.sb.writeln('.toList()', 4 + i * 2);

                    if (this.param.hasDefault) {
                        this.sb.write(` ?? ${this.param.defaultValue}`);
                    }

                    break;
                default:
                    this.sb.writeln('.toList())', 4 + i * 2);
            }
        }

        this.sb.write(',');
    }

    toString(): string {
        return this.sb.toString();
    }
}

export function toListLoop(option: {
    param: Parameter,
    tabs?: number,
    mapEntry: () => string,
}) {
    return buildString((sb) => {
        const len = option.param.type.split('<').filter((e) => e === 'List').length;
        const nullCheck = option.param.isNullable
            || option.param.isNullable && option.param.hasDefault
            ? '?'
            : '';
        const tabs = !option.tabs ? 4 : option.tabs;

        for (let i = 0; i < len; i++) {
            switch (i) {
                case 1:
                    sb.writeln(`${nullCheck}.map((e) => (e as List<dynamic>)`, tabs + i * 2);
                    break;
                default:
                    sb.writeln('.map((e) => (e as List<dynamic>)', tabs + i * 2);
            }
        }

        sb.writeln(option.mapEntry());

        for (let i = len; i > 0; i--) {
            switch (i) {
                case 1:
                    sb.writeln('.toList(),', tabs + i * 2);
                    break;
                default:
                    sb.writeln('.toList())', tabs + i * 2);
            }
        }
    });
}