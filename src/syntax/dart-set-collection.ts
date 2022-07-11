import { AssertionError } from 'assert';
import { typeIdentities } from '../interface';
import { getAbsoluteType, isPrimitive, Parameter } from '../models/parameter';
import { hasGenericType } from '../templates';
import { StringBuffer } from '../utils/string-buffer';
import { DartMapCollection } from './dart-map-collection';

export class DartSetCollection {
    private readonly sb = new StringBuffer();
    readonly hasGeneric: boolean;
    readonly castType: string;
    readonly nonNullableCastType: string;
    readonly isDynamicCast: boolean;
    readonly isPrimitiveCast: boolean;
    readonly isObjectCast: boolean;
    readonly maybeNull: string;

    constructor(readonly param: Parameter) {
        if (param.identity !== 'Set') {
            throw new AssertionError({ message: 'Parameter identity is not a Set' });
        }

        const type = getAbsoluteType(param.type);
        this.hasGeneric = hasGenericType(type);
        this.maybeNull = param.isNullable || !param.isNullable && param.hasDefault ? '?' : '';
        this.castType = type === 'Set' || type === 'Set?'
            ? 'dynamic'
            // Absolute type return at the first List absolute type, get absolute type from the Set if type is List.
            : getAbsoluteType(type);
        this.isDynamicCast = this.castType === 'dynamic';
        this.isPrimitiveCast = isPrimitive(this.castType);
        this.isObjectCast = typeIdentities.every((e) => !this.castType.startsWith(e));
        this.nonNullableCastType = this.castType.endsWith('?')
            ? this.castType.slice(0, -1)
            : this.castType;
    }

    writeDynamicElement(): string {
        this.writeDynamic();
        return this.sb.toString();
    }

    writeObjectElement(): string {
        this.writeObject();
        return this.sb.toString();
    }

    writeListCollection(): string {
        this.writeAsListDynamic();
        this.writeList();
        return this.sb.toString();
    }

    private classElement(): string {
        return `${this.nonNullableCastType}.fromMap(e as Map<String, dynamic>)`;
    }

    private writeAsListDynamic() {
        this.sb.writeln(`${this.param.name}: (map['${this.param.mapKey}'] as List<dynamic>${this.maybeNull})`, 4);
    }

    private writeDynamic(): string {
        this.writeAsListDynamic();
        this.sb.write(`${this.maybeNull}.toSet()`);

        if (this.param.hasDefault) {
            this.sb.write(` ?? ${this.param.defaultValue}`);
        }

        this.sb.write(',');

        return this.sb.toString();
    }

    writePrimitive(): string {
        this.sb.writeln(`${this.param.name}: (map['${this.param.mapKey}'] as List<${this.castType}>${this.maybeNull})`, 4);
        this.sb.write(`${this.maybeNull}.toSet()`);

        if (this.param.hasDefault) {
            this.sb.write(` ?? ${this.param.defaultValue}`);
        }

        this.sb.write(',');

        return this.sb.toString();
    }

    private writeObject() {
        if (this.castType.startsWith('Map')) {
            const map = new DartMapCollection(this.param.copyWith({
                type: this.castType,
                isNullable: this.param.isNullable,
            }));

            this.sb.write(map.writeSetCollection());

            return;
        }

        this.writeAsListDynamic();

        if (this.isObjectCast) {
            if (this.castType.endsWith('?')) {
                this.sb.writeln(`${this.maybeNull}.map((e) => e == null`, 6);
                this.sb.writeln('? null', 8);
                this.sb.writeln(`: ${this.classElement()})`, 8);
            } else {
                this.sb.writeln(`${this.maybeNull}.map((e) => ${this.classElement()})`, 6);
            }
        } else {
            this.sb.writeln(`${this.maybeNull}.map((e) => e as ${this.castType})`, 6);
        }

        this.sb.writeln('.toSet()', 6);

        if (this.param.hasDefault) {
            this.sb.write(` ?? ${this.param.defaultValue}`);
        }

        this.sb.write(',');
    }

    private writeList() {
        const len = this.param.type.split('<').filter((e) => e === 'List').length;
        const nullCheck = len === 1 ? this.maybeNull : '';
        const startIndex = this.param.isList ? 1 : 0;
        const from = 4;

        for (let i = startIndex; i < len; i++) {
            switch (i) {
                case 0:
                    this.sb.writeln(`${this.maybeNull}.map((e) => (e as List<dynamic>)`, from + 2);
                    break;
                default:
                    this.sb.writeln('.map((e) => (e as List<dynamic>)', from + i * 2);
            }
        }

        if (this.isObjectCast) {
            this.sb.writeln(`${nullCheck}.map((e) => (e as List<dynamic>)`, from + len * 2);

            if (this.castType.endsWith('?')) {
                this.sb.writeln('.map((e) => e == null', from + 2 + len * 2);
                this.sb.writeln('? null', from + 4 + len * 2);
                this.sb.writeln(`: ${this.classElement()})`, from + 4 + len * 2);
            } else {
                this.sb.writeln(`.map((e) => ${this.classElement()})`, from + 2 + len * 2);
            }

            this.sb.writeln('.toSet())', from + 2 + len * 2);
        } else if (this.castType.startsWith('Map')) {
            const map = new DartMapCollection(this.param.copyWith({
                type: this.castType,
                isNullable: this.param.isNullable,
            }));
            this.sb.write(map.mapToSet(len * 2));
        } else {
            const tabs = from + len * 2;
            this.sb.writeln(`${nullCheck}.map((e) => (e as List<${this.castType}>)`, tabs);
            this.sb.write('.toSet())');
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
