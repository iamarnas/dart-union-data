import { ClassElement, FieldElement } from '../element/element';
import { StringBuffer } from '../utils/string-buffer';

export class EnumExtensionGenerator {
    private element: ClassElement;
    private enumType: string;
    private values: FieldElement[] = [];
    private sb: StringBuffer = new StringBuffer();

    constructor(element: ClassElement) {
        this.element = element;
        this.enumType = element.name;
        this.values = element.fields;
    }

    generate(): string {
        this.extensionHead();
        this.checkers();
        this.methods();
        this.extensionBottom();
        return this.sb.toString();
    }

    private extensionHead() {
        const name = `${this.enumType}Extension`;
        this.sb.writeln(`extension ${name} on ${this.enumType} {`);
    }

    private checkers() {
        for (const value of this.values) {
            this.checker(value);
        }
    }

    private checker(e: FieldElement) {
        if (!e.name) return;
        const name = e.name.slice(0, 1).toUpperCase() + e.name.slice(1);
        this.sb.writeln(`bool get is${name} => this == ${this.enumType}.${e.name};`, 1);
    }

    private extensionBottom() {
        this.sb.writeln('}');
    }

    private methods() {
        const methodGenerator = new MethodGenerator(this.element);
        this.sb.writeln(methodGenerator.generate('map'));
        this.sb.writeln(methodGenerator.generate('maybeMap'));
        this.sb.writeln(methodGenerator.generate('mapOrNull'));
        this.sb.writeln(methodGenerator.generate('when'));
        this.sb.writeln(methodGenerator.generate('maybeWhen'));
        this.sb.writeln(methodGenerator.generate('whenOrNull'));
    }
}

class MethodGenerator {
    private element: ClassElement;
    private values: FieldElement[];
    private sb: StringBuffer = new StringBuffer();
    private methodType: MethodType = 'when';
    private name: string;

    constructor(element: ClassElement) {
        this.element = element;
        this.values = element.fields;
        this.name = element.name;
    }

    static fromElement(element: ClassElement): MethodGenerator {
        return new MethodGenerator(element);
    }

    generate(methodType: MethodType): string {
        this.initialize(methodType);
        this.methodName();
        this.methodConstructor();
        this.methodBlock();
        return this.sb.toString();
    }

    private initialize(methodType: MethodType) {
        this.sb.clean();
        this.methodType = methodType;
    }

    private methodName() {
        switch (this.methodType) {
            case 'when':
                this.sb.writeln('R when<R>', 1);
                break;
            case 'maybeWhen':
                this.sb.writeln('R maybeWhen<R>', 1);
                break;
            case 'whenOrNull':
                this.sb.writeln('R? whenOrNull<R>', 1);
                break;
            case 'map':
                this.sb.writeln('R map<R>', 1);
                break;
            case 'maybeMap':
                this.sb.writeln('R maybeMap<R>', 1);
                break;
            case 'mapOrNull':
                this.sb.writeln('R? mapOrNull<R>', 1);
                break;
        }
    }

    private methodConstructor() {
        switch (this.methodType) {
            case 'when':
                this.whenConstructor();
                break;
            case 'maybeWhen':
                this.maybeWhenConstructor();
                break;
            case 'whenOrNull':
                this.whenOrNullConstructor();
                break;
            case 'map':
                this.mapConstructor();
                break;
            case 'maybeMap':
                this.maybeMapConstructor();
                break;
            case 'mapOrNull':
                this.mapOrNullConstructor();
                break;
        }
    }

    private methodBlock() {
        switch (this.methodType) {
            case 'when':
                this.whenBlock();
                break;
            case 'maybeWhen':
                this.maybeWhenBlock();
                break;
            case 'whenOrNull':
                this.whenOrNullBlock();
                break;
            case 'map':
                this.mapBlock();
                break;
            case 'maybeMap':
                this.maybeMapBlock();
                break;
            case 'mapOrNull':
                this.mapOrNullBlock();
                break;
        }
    }

    private mapOrNullConstructor() {
        this.sb.write('({');
        for (const value of this.values) {
            this.sb.writeln(`R Function(${this.name} ${value.name})? ${value.name},`, 2);
        }
        this.sb.writeln('})', 1);
    }

    private maybeMapConstructor() {
        this.sb.write('({');
        for (const value of this.values) {
            this.sb.writeln(`R Function(${this.name} ${value.name})? ${value.name},`, 2);
        }
        this.sb.writeln('required R Function() orElse,', 2);
        this.sb.writeln('})', 1);
    }

    private mapConstructor() {
        this.sb.write('({');
        for (const value of this.values) {
            this.sb.writeln(`required R Function(${this.name} ${value.name}) ${value.name},`, 2);
        }
        this.sb.writeln('})', 1);
    }

    private whenOrNullConstructor() {
        this.sb.write('({');
        for (const value of this.values) {
            this.sb.writeln(`R Function()? ${value.name},`, 2);
        }
        this.sb.writeln('})', 1);
    }

    private maybeWhenConstructor() {
        this.sb.write('({');
        for (const value of this.values) {
            this.sb.writeln(`R Function()? ${value.name},`, 2);
        }
        this.sb.writeln('required R Function() orElse,', 2);
        this.sb.writeln('})', 1);
    }

    private whenConstructor() {
        this.sb.write('({');
        for (const value of this.values) {
            this.sb.writeln(`required R Function() ${value.name},`, 2);
        }
        this.sb.writeln('})', 1);
    }

    private whenBlock() {
        this.sb.write(' {');
        this.sb.writeln('switch (this) {', 2);
        for (const value of this.values) {
            this.sb.writeln(`case ${this.name}.${value.name}:`, 3);
            this.sb.writeln(`return ${value.name}();`, 4);
        }
        this.sb.writeln('}', 2);
        this.sb.writeln('}', 1);
    }

    private maybeWhenBlock() {
        this.sb.write(' {');
        for (let i = 0; i < this.values.length; i++) {
            const value = this.values[i];

            if (i === 0) {
                this.sb.writeln(`if (this == ${this.name}.${value.name} && ${value.name} != null) {`, 2);
                this.sb.writeln(`return ${value.name}();`, 3);
            } else {
                this.sb.writeln(`} else if (this == ${this.name}.${value.name} && ${value.name} != null) {`, 2);
                this.sb.writeln(`return ${value.name}();`, 3);
            }
        }
        this.sb.writeln('} else {', 2);
        this.sb.writeln('return orElse();', 3);
        this.sb.writeln('}', 2);
        this.sb.writeln('}', 1);
    }

    private whenOrNullBlock() {
        this.sb.write(' {');
        this.sb.writeln('switch (this) {', 2);
        for (const value of this.values) {
            this.sb.writeln(`case ${this.name}.${value.name}:`, 3);
            this.sb.writeln(`return ${value.name}?.call();`, 4);
        }
        this.sb.writeln('}', 2);
        this.sb.writeln('}', 1);
    }

    private mapBlock() {
        this.sb.write(' {');
        this.sb.writeln('switch (this) {', 2);
        for (const value of this.values) {
            this.sb.writeln(`case ${this.name}.${value.name}:`, 3);
            this.sb.writeln(`return ${value.name}(this);`, 4);
        }
        this.sb.writeln('}', 2);
        this.sb.writeln('}', 1);
    }

    private maybeMapBlock() {
        this.sb.write(' {');
        for (let i = 0; i < this.values.length; i++) {
            const value = this.values[i];

            if (i === 0) {
                this.sb.writeln(`if (this == ${this.name}.${value.name} && ${value.name} != null) {`, 2);
                this.sb.writeln(`return ${value.name}(this);`, 3);
            } else {
                this.sb.writeln(`} else if (this == ${this.name}.${value.name} && ${value.name} != null) {`, 2);
                this.sb.writeln(`return ${value.name}(this);`, 3);
            }
        }
        this.sb.writeln('} else {', 2);
        this.sb.writeln('return orElse();', 3);
        this.sb.writeln('}', 2);
        this.sb.writeln('}', 1);
    }

    private mapOrNullBlock() {
        this.sb.write(' {');
        this.sb.writeln('switch (this) {', 2);
        for (const value of this.values) {
            this.sb.writeln(`case ${this.name}.${value.name}:`, 3);
            this.sb.writeln(`return ${value.name}?.call(this);`, 4);
        }
        this.sb.writeln('}', 2);
        this.sb.writeln('}', 1);
    }
}

type MethodType = 'when' | 'maybeWhen' | 'whenOrNull' | 'map' | 'maybeMap' | 'mapOrNull';