import ClassData from '../element/class.data';
import { FieldElement } from '../element/element';
import { StringBuffer } from '../utils/string-buffer';

export class MethodGenerator {
    private readonly fields: FieldElement[];
    private readonly name: string;
    private sb: StringBuffer = new StringBuffer();
    private methodType: MethodType = 'when';

    constructor(private readonly element: ClassData) {
        this.fields = element.fields;
        this.name = element.name;
    }

    static fromElement(element: ClassData): MethodGenerator {
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
        for (const field of this.fields) {
            this.sb.writeln(`R Function(${this.name} ${field.name})? ${field.name},`, 2);
        }
        this.sb.writeln('})', 1);
    }

    private maybeMapConstructor() {
        this.sb.write('({');
        for (const field of this.fields) {
            this.sb.writeln(`R Function(${this.name} ${field.name})? ${field.name},`, 2);
        }
        this.sb.writeln('required R Function() orElse,', 2);
        this.sb.writeln('})', 1);
    }

    private mapConstructor() {
        this.sb.write('({');
        for (const field of this.fields) {
            this.sb.writeln(`required R Function(${this.name} ${field.name}) ${field.name},`, 2);
        }
        this.sb.writeln('})', 1);
    }

    private whenOrNullConstructor() {
        this.sb.write('({');
        for (const field of this.fields) {
            this.sb.writeln(`R Function()? ${field.name},`, 2);
        }
        this.sb.writeln('})', 1);
    }

    private maybeWhenConstructor() {
        this.sb.write('({');
        for (const field of this.fields) {
            this.sb.writeln(`R Function()? ${field.name},`, 2);
        }
        this.sb.writeln('required R Function() orElse,', 2);
        this.sb.writeln('})', 1);
    }

    private whenConstructor() {
        this.sb.write('({');
        for (const field of this.fields) {
            this.sb.writeln(`required R Function() ${field.name},`, 2);
        }
        this.sb.writeln('})', 1);
    }

    private whenBlock() {
        this.sb.write(' {');
        this.sb.writeln('switch (this) {', 2);
        for (const field of this.fields) {
            this.sb.writeln(`case ${this.name}.${field.name}:`, 3);
            this.sb.writeln(`return ${field.name}();`, 4);
        }
        this.sb.writeln('}', 2);
        this.sb.writeln('}', 1);
    }

    private maybeWhenBlock() {
        this.sb.write(' {');
        for (let i = 0; i < this.fields.length; i++) {
            const value = this.fields[i];

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
        for (const field of this.fields) {
            this.sb.writeln(`case ${this.name}.${field.name}:`, 3);
            this.sb.writeln(`return ${field.name}?.call();`, 4);
        }
        this.sb.writeln('}', 2);
        this.sb.writeln('}', 1);
    }

    private mapBlock() {
        this.sb.write(' {');
        this.sb.writeln('switch (this) {', 2);
        for (const field of this.fields) {
            this.sb.writeln(`case ${this.name}.${field.name}:`, 3);
            this.sb.writeln(`return ${field.name}(this);`, 4);
        }
        this.sb.writeln('}', 2);
        this.sb.writeln('}', 1);
    }

    private maybeMapBlock() {
        this.sb.write(' {');
        for (let i = 0; i < this.fields.length; i++) {
            const value = this.fields[i];

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
        for (const field of this.fields) {
            this.sb.writeln(`case ${this.name}.${field.name}:`, 3);
            this.sb.writeln(`return ${field.name}?.call(this);`, 4);
        }
        this.sb.writeln('}', 2);
        this.sb.writeln('}', 1);
    }
}

type MethodType = 'when' | 'maybeWhen' | 'whenOrNull' | 'map' | 'maybeMap' | 'mapOrNull';
