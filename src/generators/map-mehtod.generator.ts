import { getAbsoluteType, Parameter } from '../models/parameter';
import pubspec from '../shared/pubspec';
import { DartListCollection } from '../syntax/dart-list-collection';
import { DartMapCollection } from '../syntax/dart-map-collection';
import { DartSetCollection } from '../syntax/dart-set-collection';
import { ClassDataTemplate, ParametersTemplate, SubclassTemplate } from '../templates';
import '../types/string';
import { buildString, StringBuffer } from '../utils/string-buffer';

export class MapMethodGenerator {
    private sb = new StringBuffer();
    private readonly parameters: ParametersTemplate;
    private readonly className: string;
    private sdkVersion = 2.12;

    constructor(private readonly element: ClassDataTemplate | SubclassTemplate) {
        this.parameters = element instanceof ClassDataTemplate
            ? element.instances
            : element.parameters;
        this.sdkVersion = element instanceof ClassDataTemplate
            ? element.settings.sdkVersion
            : element.superclass.settings.sdkVersion;
        this.className = element.name;
    }

    /**
     * The generated map item.
     */
    get fromMapItems(): string[] {
        return this.parameters.all.map((e) => this.fromMapItem(e));
    }

    get toMapItems(): string[] {
        return this.parameters.all.map((e) => this.toMapItem(e));
    }

    writeFromMap(): this {
        this.sb.write(`factory ${this.className}.fromMap(Map<String, dynamic> map) => ${this.className}(`, 1);
        this.sb.writeBlock(this.fromMapItems);
        this.sb.writeln(');', 3);

        return this;
    }

    writeToMap(): this {
        this.sb.write('Map<String, dynamic> toMap() => <String, dynamic>{', 1);
        this.sb.writeBlock(this.toMapItems);
        this.sb.writeln('};', 3);

        return this;
    }

    writeToJson(): this {
        this.sb.write('String toJson() => json.encode(toMap());', 1);
        return this;
    }

    writeFromJson(): this {
        this.sb.write(`factory ${this.className}.fromJson(String source) {`, 1);
        this.sb.writeln(`return ${this.className}.fromMap(json.decode(source) as Map<String, dynamic>);`, 2);
        this.sb.writeln('}', 1);
        return this;
    }

    writeJsonCodecs(): this {
        this.writeFromJson();
        this.sb.writeln('\n');
        this.writeToJson();
        this.sb.writeln('\n');
        this.writeFromMap();
        this.sb.writeln('\n');
        this.writeToMap();

        return this;
    }

    generate(): string {
        return this.sb.toString();
    }

    private fromMapItem(param: Parameter): string {
        const nullable = param.hasDefault && !param.type.endsWith('?') ? '?' : '';

        return buildString((sb) => {
            switch (param.identity) {
                case 'DateTime':
                    sb.write(classElementFromMap(param));
                    break;
                case 'unknown':
                    sb.write(classElementFromMap(param));
                    break;
                case 'BigInt':
                    sb.write(classElementFromMap(param));
                    break;
                case 'Uri':
                    sb.write(classElementFromMap(param));
                    break;
                case 'enum':
                    sb.write(enumFromMap(param, this.sdkVersion));
                    break;
                case 'double':
                    sb.write(`${param.name}: (map['${param.mapKey}'] as num).toDouble(),`, 4);
                    break;
                case 'Set':
                    sb.write(dartSetCollectionFromMap(param));
                    break;
                case 'Map':
                    sb.write(dartMapCollectionFromMap(param));
                    break;
                case 'Object':
                    sb.write(`${param.name}: map['${param.mapKey}'],`, 4);
                    break;
                case 'dynamic':
                    sb.write(`${param.name}: map['${param.mapKey}'],`, 4);
                    break;
                case 'UnmodifiableListView':
                    sb.write(`${param.name}: map['${param.mapKey}'] as ${param.type},`, 4);
                    break;
                case 'UnmodifiableSetView':
                    sb.write(`${param.name}: map['${param.mapKey}'] as ${param.type},`, 4);
                    break;
                case 'UnmodifiableMapView':
                    sb.write(`${param.name}: map['${param.mapKey}'] as ${param.type},`, 4);
                    break;
                default:
                    sb.write(`${param.name}: map['${param.mapKey}'] as ${param.type}${nullable}`, 4);

                    if (param.hasDefault) {
                        sb.write(` ?? ${param.defaultValue}`);
                    }

                    sb.write(',');
            }
        });
    }

    private toMapItem(param: Parameter): string {
        const nullable = param.isNullable && !param.hasDefault && !param.isList ? '?' : '';

        return buildString((sb) => {
            switch (param.identity) {
                case 'DateTime':
                    sb.write(toMap(param, `${nullable}.toIso8601String()`), 4);
                    break;
                case 'unknown':
                    if (param.isList) {
                        sb.write(toMap(param, `${nullable}.toMap()`), 4);
                        break;
                    }

                    sb.write(toMap(param, ''), 4);
                    break;
                case 'BigInt':
                    sb.write(toMap(param, `${nullable}.toString()`), 4);
                    break;
                case 'Uri':
                    sb.write(toMap(param, `${nullable}.toString()`), 4);
                    break;
                case 'Set':
                    sb.write(toMap(param, `${nullable}.toList()`), 4);
                    break;
                case 'enum':
                    if (pubspec.sdkVersion >= 2.14) {
                        sb.write(toMap(param, `${nullable}.name`), 4);
                        break;
                    }

                    sb.write(toMap(param, `${nullable}.index`), 4);
                    break;
                default:
                    sb.write(`'${param.name}': ${param.name},`, 4);
            }
        });
    }
}

function toMap(param: Parameter, value: string): string {
    const sb = new StringBuffer();
    const len = param.type.split('<').filter((e) => e === 'List').length;
    const open = Array.from(Array(len)).map((_) => 'map((e) => e');
    const close = Array.from(Array(len)).map((_) => ')');
    const nullable = param.isNullable ? '?' : '';
    const expression = `'${param.name}': ${param.name}`;

    if (len === 0) {
        sb.writeln(`${expression}${value},`, 4);
    } else {
        sb.writeln(`${expression}${nullable}.`, 4);
        sb.writeAll(open, '.');
        sb.write(`${value}`);
        sb.writeAll(close, '');
        sb.write('.toList(),');
    }

    return sb.toString();
}

function classElementFromMap(param: Parameter): string {
    if (param.isPrimitive) {
        console.error(`Returned empty string due to wrong cast of parameter identity: ${param.identity}`);
        return '';
    }

    const sb = new StringBuffer();
    const absoluteType = getAbsoluteType(param.type);
    const name = absoluteType.endsWith('?') ? absoluteType.slice(0, -1) : absoluteType;

    if (param.isList) {
        const list = new DartListCollection(param);
        list.writeAsListDynamicMapEntry();

        if (param.identity === 'unknown') {
            list.toList(() => `${name.capitalize()}.fromMap(e as Map<String, dynamic>)`);
        }

        if (param.identity === 'DateTime') {
            list.toList(() => 'DateTime.parse(e as String)');
        }

        if (param.identity === 'BigInt') {
            list.toList(() => 'BigInt.parse(e as String)');
        }

        if (param.identity === 'Uri') {
            list.toList(() => 'Uri.parse(e as String)');
        }

        sb.write(list.toString());
    } else {
        if (param.isNullable) {
            sb.writeln(`${param.name}: map['${param.mapKey}'] == null`, 4);
            sb.writeln('? null', 6);

            if (param.identity === 'unknown') {
                sb.writeln(`: ${name.capitalize()}.fromMap(map['${param.mapKey}'] as Map<String, dynamic>),`, 6);
            }

            if (param.identity === 'DateTime') {
                sb.writeln(`: DateTime.parse(map['${param.mapKey}'] as String),`, 6);
            }

            if (param.identity === 'BigInt') {
                sb.writeln(`: BigInt.parse(map['${param.mapKey}'] as String),`, 6);
            }

            if (param.identity === 'Uri') {
                sb.writeln(`: Uri.parse(map['${param.mapKey}'] as String),`, 6);
            }
        } else {
            if (param.identity === 'unknown') {
                sb.writeln(
                    `${param.name}: ${name.capitalize()}.fromMap(map['${param.mapKey}'] as Map<String, dynamic>),`
                    , 4,
                );
            }

            if (param.identity === 'DateTime') {
                sb.writeln(`${param.name}: DateTime.parse(map['${param.mapKey}'] as String),`, 4);
            }

            if (param.identity === 'BigInt') {
                sb.writeln(`${param.name}: BigInt.parse(map['${param.mapKey}'] as String),`, 4);
            }

            if (param.identity === 'Uri') {
                sb.writeln(`${param.name}: Uri.parse(map['${param.mapKey}'] as String),`, 4);
            }
        }
    }

    return sb.toString();
}

function enumFromMap(param: Parameter, sdk: number): string {
    if (param.identity !== 'enum') {
        console.error('Returned empty string due to wrong cast of parameter identity');
        return '';
    }

    return buildString((sb) => {
        const expression = sdk >= 2.14
            ? `${param.typeName}.values.byName(map['${param.mapKey}'] as String),`
            : `${param.typeName}.values.elementAt(map['${param.mapKey}'] as int),`;

        sb.writeln(`${param.name}: ${expression}`, 4);
    });
}

function dartSetCollectionFromMap(param: Parameter): string {
    if (param.identity !== 'Set') {
        console.error('Returned empty string due to wrong cast of parameter identity');
        return '';
    }

    const set = new DartSetCollection(param);

    if (param.isList) {
        return set.writeListCollection();
    } else if (set.isDynamicCast) {
        return set.writeDynamicElement();
    } else if (set.isPrimitiveCast) {
        return set.writePrimitive();
    }

    return set.writeObjectElement();
}

function dartMapCollectionFromMap(param: Parameter): string {
    if (param.identity !== 'Map') {
        console.error('Returned empty string due to wrong cast of parameter identity');
        return '';
    }

    const map = new DartMapCollection(param);

    if (param.isList) {
        return map.writeListCollection();
    } else if (map.entry.isDynamic) {
        return map.writeDynamicElement();
    }

    return map.writeObjectElement();
}