import { AssertionError } from 'assert';
import { GenericType, TypeIdentity } from '../interface';
import { getAbsoluteType, getTypeIdentify, isPrimitive, Parameter } from '../models/parameter';
import pubspec from '../shared/pubspec';
import '../types/string';
import { StringBuffer } from '../utils/string-buffer';

export class DartMapCollection {
    private readonly sb = new StringBuffer();
    readonly entry: MapEntry;
    readonly maybeNull: string;

    constructor(readonly param: Parameter) {
        if (param.identity !== 'Map') {
            throw new AssertionError({ message: 'Parameter identity is not a Map' });
        }

        this.entry = new MapEntry(param);
        this.maybeNull = param.isNullable || !param.isNullable && param.hasDefault ? '?' : '';
    }

    writeObjectElement(): string {
        this.writeAsMap();
        this.writeObject();
        return this.sb.toString();
    }

    writeDynamicElement(): string {
        this.sb.writeln(`${this.param.name}: map['${this.param.mapKey}'] as Map<dynamic, dynamic>${this.maybeNull}`, 4);

        if (this.param.hasDefault) {
            this.sb.write(` ?? ${this.param.defaultValue}`);
        }

        this.sb.write(',');

        return this.sb.toString();
    }

    writeListCollection(): string {
        this.writeAsListDynamic();
        this.writeList();
        return this.sb.toString();
    }

    writeSetCollection(): string {
        this.writeAsListDynamic();
        this.toSet();
        return this.sb.toString();
    }


    toSet(option?: { withoutDefault: boolean }) {
        this.sb.writeln(`${this.maybeNull}.map((e) => (e as ${this.entry.type}).map((k, e) =>`, 6);
        this.sb.writeln(`${this.entry.mapEntry()}))`, 8);
        this.sb.writeln('.toSet()', 6);

        if (this.param.hasDefault && !option?.withoutDefault) {
            this.sb.write(` ?? ${this.param.defaultValue}`);
        }

        this.sb.write(',');
    }

    mapToSet(tab = 0): string {
        this.sb.writeln(`.map((e) => (e as ${this.entry.type}).map((k, e) =>`, 6 + tab);
        this.sb.writeln(`${this.entry.mapEntry()}))`, 8 + tab);
        this.sb.writeln('.toSet())', 6 + tab);
        return this.sb.toString();
    }

    private writeAsMap() {
        const maybeNull = !this.entry.type.endsWith('?') && this.param.hasDefault ? '?' : '';
        this.sb.write(`${this.param.name}: (map['${this.param.mapKey}'] as ${this.entry.type}${maybeNull})`, 4);
    }

    private writeAsListDynamic() {
        this.sb.writeln(`${this.param.name}: (map['${this.param.mapKey}'] as List<dynamic>${this.maybeNull})`, 4);
    }

    private writeObject(): string {
        this.sb.write(`${this.maybeNull}.map(`);

        if (this.entry.value.isClassElement) {
            const tabs = this.param.hasDefault ? 7 : 5;
            this.sb.writeln(`(k, e) => ${this.entry.mapEntry()},`, tabs);
        } else {
            this.sb.writeln(`(k, e) => ${this.entry.mapEntry()},`, 5);
        }

        const tabs = this.param.hasDefault ? 6 : 4;
        this.sb.writeln(')', tabs);

        if (this.param.hasDefault) {
            this.sb.write(' ??');
            this.sb.writeln(`${this.param.defaultValue}`, 6);
        }

        this.sb.write(',');

        return this.sb.toString();
    }

    private writeList() {
        const len = this.param.type.split('<').filter((e) => e === 'List').length;
        const nullCheck = len === 1 ? this.maybeNull : '';
        const from = 4;

        for (let i = 1; i < len; i++) {
            switch (i) {
                case 1:
                    this.sb.writeln(`${this.maybeNull}.map((e) => (e as List<dynamic>)`, from + i * 2);
                    break;
                default:
                    this.sb.writeln('.map((e) => (e as List<dynamic>)', from + i * 2);
            }
        }

        if (this.entry.value.isClassElement || this.entry.key.isClassElement) {
            this.sb.writeln(`${nullCheck}.map((e) => (e as ${this.entry.type}).map(`, from + len * 2);
            this.sb.writeln(`(k, e) => ${this.entry.mapEntry()}))`, from + 2 + len * 2);
        } else {
            const tabs = from + len * 2;
            this.sb.writeln(`${nullCheck}.map((e) => ${this.entry.type}.from(e as Map))`, tabs);
        }

        for (let i = len; i > 0; i--) {
            switch (i) {
                case 1:
                    this.sb.writeln('.toList()', from + i * 2);

                    if (this.param.hasDefault) {
                        this.sb.write(` ?? ${this.param.defaultValue}`);
                    }

                    this.sb.write(',');
                    break;
                default:
                    this.sb.writeln('.toList())', from + i * 2);
            }
        }
    }
}

class MapEntry {
    readonly type: string;
    /** key input is `k` */
    readonly key: MapEntryProperty;
    /** key input is `e` */
    readonly value: MapEntryProperty;
    readonly isDynamic: boolean;
    readonly maybeNull: string;

    constructor(readonly param: Parameter) {
        if (param.identity !== 'Map') {
            throw new AssertionError({ message: 'Parameter identity is not a Map' });
        }

        this.type = getAbsoluteType(param.type);
        const hasGeneric = GenericType.isGeneric(this.type);
        const key = hasGeneric
            ? this.type.getRange('<', this.type.indexOf(','), true).trim()
            : 'dynamic';
        const value = hasGeneric
            ? this.type.getRange(',', this.type.indexOf('>'), true).trim()
            : 'dynamic';
        this.maybeNull = param.isNullable || !param.isNullable && param.hasDefault ? '?' : '';
        this.isDynamic = !hasGeneric
            || (key.startsWith('dynamic') && value.startsWith('dynamic'));
        this.key = new MapEntryProperty(key, 'k', param.enums.includes(key));
        this.value = new MapEntryProperty(value, 'e', param.enums.includes(value));
    }

    mapEntry(): string {
        return `MapEntry(${this.key.fromMap()}, ${this.value.fromMap()})`;
    }
}

class MapEntryProperty {
    readonly name: string;
    readonly identity: TypeIdentity;
    readonly isPrimitive: boolean;
    readonly isClassElement: boolean;

    constructor(readonly type: string, readonly key: string, public isEnum = false) {
        this.name = this.type.endsWith('?')
            ? this.type.slice(0, -1)
            : this.type;
        this.identity = getTypeIdentify(type);
        this.isPrimitive = isPrimitive(type);
        this.isClassElement = this.identity === 'unknown';
    }

    fromMap(): string {
        if (this.isEnum || this.identity === 'enum') {
            if (pubspec.sdkVersion >= 2.14) {
                return `${this.name}.values.byName(${this.key}.name)`;
            }
            return `${this.name}.values.elementAt(${this.key}.index)`;
        } else if (this.identity === 'unknown') {
            return `${this.name}.fromMap(${this.key}.toMap())`;
        } else if (this.identity === 'DateTime') {
            return `DateTime.parse(${this.key} as String)`;
        }

        return this.key;
    }
}