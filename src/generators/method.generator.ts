import { FieldElement } from '../interface/element';
import { ClassData } from '../models/class.data';
import { ConstructorData } from '../models/constructor.data';
import { } from '../utils/string-apis';
import StringBuffer from '../utils/string-buffer';

export class MethodGenerator {
    private readonly fields: FieldElement[];
    private readonly factories: ConstructorData[];
    private readonly name: string;
    private readonly superclass: string;
    private sb: StringBuffer = new StringBuffer();
    private methodType: MethodType = 'when';

    constructor(private readonly element: ClassData) {
        this.factories = element.factories;
        this.fields = element.fields;
        this.name = element.name;
        this.superclass = element.name.decapitalize();
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

    get whenEnumFunctions(): string[] {
        return this.fields.map((e) => `required R Function() ${e.name}`);
    }

    get whenFunctions(): string[] {
        return this.factories.map((e) => `required R Function(${e.callbackParams}) ${e.name}`);
    }

    get maybeWhenEnumFunctions(): string[] {
        return this.fields.map((e) => `R Function()? ${e.name}`);
    }

    get maybeWhenFunctions(): string[] {
        return this.factories.map((e) => `R Function(${e.callbackParams})? ${e.name}`);
    }

    get mapEnumFunctions(): string[] {
        return this.fields.map((e) => `required R Function(${this.name} ${e.name}) ${e.name}`);
    }

    get mapFunctions(): string[] {
        return this.factories.map((e) => `required R Function(${e.displayType} ${e.name}) ${e.name}`);
    }

    get maybeMapEnumFunctions(): string[] {
        return this.fields.map((e) => `R Function(${this.name} ${e.name})? ${e.name}`);
    }

    get maybeMapFunctions(): string[] {
        return this.factories.map((e) => `R Function(${e.displayType} ${e.name})? ${e.name}`);
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

        if (this.element.isEnum) {
            this.sb.writeBlock(this.maybeMapEnumFunctions, ',', 2);
        } else {
            this.sb.writeBlock(this.maybeMapFunctions, ',', 2);
        }

        this.sb.writeln('})', 1);
    }

    private maybeMapConstructor() {
        this.sb.write('({');

        if (this.element.isEnum) {
            this.sb.writeBlock(this.maybeMapEnumFunctions, ',', 2);
        } else {
            this.sb.writeBlock(this.maybeMapFunctions, ',', 2);
        }

        this.sb.writeln('required R Function() orElse,', 2);
        this.sb.writeln('})', 1);
    }

    private mapConstructor() {
        this.sb.write('({');

        if (this.element.isEnum) {
            this.sb.writeBlock(this.mapEnumFunctions, ',', 2);
        } else {
            this.sb.writeBlock(this.mapFunctions, ',', 2);
        }

        this.sb.writeln('})', 1);
    }

    private whenOrNullConstructor() {
        this.sb.write('({');

        if (this.element.isEnum) {
            this.sb.writeBlock(this.maybeWhenEnumFunctions, ',', 2);
        } else {
            this.sb.writeBlock(this.maybeWhenFunctions, ',', 2);
        }

        this.sb.writeln('})', 1);
    }

    private maybeWhenConstructor() {
        this.sb.write('({');

        if (this.element.isEnum) {
            this.sb.writeBlock(this.maybeWhenEnumFunctions, ',', 2);
        } else {
            this.sb.writeBlock(this.maybeWhenFunctions, ',', 2);
        }

        this.sb.writeln('required R Function() orElse,', 2);
        this.sb.writeln('})', 1);
    }

    private whenConstructor() {
        this.sb.write('({');

        if (this.element.isEnum) {
            this.sb.writeBlock(this.whenEnumFunctions, ',', 2);
        } else {
            this.sb.writeBlock(this.whenFunctions, ',', 2);
        }

        this.sb.writeln('})', 1);
    }

    private whenBlock() {
        this.sb.write(' {');

        if (this.element.isEnum) {
            this.sb.writeln('switch (this) {', 2);

            for (const field of this.fields) {
                this.sb.writeln(`case ${this.name}.${field.name}:`, 3);
                this.sb.writeln(`return ${field.name}();`, 4);
            }

            this.sb.writeln('}', 2);
        } else {
            this.sb.writeln(`final ${this.superclass} = this;`, 2);

            for (let i = 0; i < this.factories.length; i++) {
                const value = this.factories[i];

                if (i === 0) {
                    this.sb.writeln(`if (${this.superclass} is ${value.displayType}) {`, 2);
                    this.sb.writeln(`return ${value.name}(${value.callbackParamsFrom(this.superclass)});`, 3);
                } else {
                    this.sb.writeln(`} else if (${this.superclass} is ${value.displayType}) {`, 2);
                    this.sb.writeln(`return ${value.name}(${value.callbackParamsFrom(this.superclass)});`, 3);
                }
            }

            this.sb.writeln('} else {', 2);
            this.sb.writeln('throw AssertionError();', 3);
            this.sb.writeln('}', 2);
        }

        this.sb.writeln('}', 1);
    }

    private maybeWhenBlock() {
        this.sb.write(' {');

        if (this.element.isEnum) {

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
        } else {
            this.sb.writeln(`final ${this.superclass} = this;`, 2);

            for (let i = 0; i < this.factories.length; i++) {
                const value = this.factories[i];

                if (i === 0) {
                    this.sb.writeln(`if (${this.superclass} is ${value.displayType}) {`, 2);
                    this.sb.writeln(`return ${value.name}?.call(${value.callbackParamsFrom(this.superclass)}) ?? orElse();`, 3);
                } else {
                    this.sb.writeln(`} else if (${this.superclass} is ${value.displayType}) {`, 2);
                    this.sb.writeln(`return ${value.name}?.call(${value.callbackParamsFrom(this.superclass)}) ?? orElse();`, 3);
                }
            }
            this.sb.writeln('} else {', 2);
            this.sb.writeln('throw AssertionError();', 3);
            this.sb.writeln('}', 2);
        }
        this.sb.writeln('}', 1);
    }

    private whenOrNullBlock() {
        this.sb.write(' {');

        if (this.element.isEnum) {
            this.sb.writeln('switch (this) {', 2);

            for (const field of this.fields) {
                this.sb.writeln(`case ${this.name}.${field.name}:`, 3);
                this.sb.writeln(`return ${field.name}?.call();`, 4);
            }

            this.sb.writeln('}', 2);
        } else {
            this.sb.writeln(`final ${this.superclass} = this;`, 2);

            for (let i = 0; i < this.factories.length; i++) {
                const value = this.factories[i];

                if (i === 0) {
                    this.sb.writeln(`if (${this.superclass} is ${value.displayType}) {`, 2);
                    this.sb.writeln(`return ${value.name}?.call(${value.callbackParamsFrom(this.superclass)});`, 3);
                } else {
                    this.sb.writeln(`} else if (${this.superclass} is ${value.displayType}) {`, 2);
                    this.sb.writeln(`return ${value.name}?.call(${value.callbackParamsFrom(this.superclass)});`, 3);
                }
            }
            this.sb.writeln('} else {', 2);
            this.sb.writeln('throw AssertionError();', 3);
            this.sb.writeln('}', 2);
        }

        this.sb.writeln('}', 1);
    }

    private mapBlock() {
        this.sb.write(' {');

        if (this.element.isEnum) {
            this.sb.writeln('switch (this) {', 2);

            for (const field of this.fields) {
                this.sb.writeln(`case ${this.name}.${field.name}:`, 3);
                this.sb.writeln(`return ${field.name}(this);`, 4);
            }
        } else {
            this.sb.writeln(`final ${this.superclass} = this;`, 2);

            for (let i = 0; i < this.factories.length; i++) {
                const value = this.factories[i];

                if (i === 0) {
                    this.sb.writeln(`if (${this.superclass} is ${value.displayType}) {`, 2);
                    this.sb.writeln(`return ${value.name}(${this.superclass});`, 3);
                } else {
                    this.sb.writeln(`} else if (${this.superclass} is ${value.displayType}) {`, 2);
                    this.sb.writeln(`return ${value.name}(${this.superclass});`, 3);
                }
            }

            this.sb.writeln('} else {', 2);
            this.sb.writeln('throw AssertionError();', 3);
        }

        this.sb.writeln('}', 2);
        this.sb.writeln('}', 1);
    }

    private maybeMapBlock() {
        this.sb.write(' {');

        if (this.element.isEnum) {
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
        } else {
            this.sb.writeln(`final ${this.superclass} = this;`, 2);

            for (let i = 0; i < this.factories.length; i++) {
                const value = this.factories[i];

                if (i === 0) {
                    this.sb.writeln(`if (${this.superclass} is ${value.displayType}) {`, 2);
                    this.sb.writeln(`return ${value.name}?.call(${this.superclass}) ?? orElse();`, 3);
                } else {
                    this.sb.writeln(`} else if (${this.superclass} is ${value.displayType}) {`, 2);
                    this.sb.writeln(`return ${value.name}?.call(${this.superclass}) ?? orElse();`, 3);
                }
            }

            this.sb.writeln('} else {', 2);
            this.sb.writeln('throw AssertionError();', 3);
        }

        this.sb.writeln('}', 2);
        this.sb.writeln('}', 1);
    }

    private mapOrNullBlock() {
        this.sb.write(' {');

        if (this.element.isEnum) {
            this.sb.writeln('switch (this) {', 2);

            for (const field of this.fields) {
                this.sb.writeln(`case ${this.name}.${field.name}:`, 3);
                this.sb.writeln(`return ${field.name}?.call(this);`, 4);
            }
        } else {
            this.sb.writeln(`final ${this.superclass} = this;`, 2);

            for (let i = 0; i < this.factories.length; i++) {
                const value = this.factories[i];

                if (i === 0) {
                    this.sb.writeln(`if (${this.superclass} is ${value.displayType}) {`, 2);
                    this.sb.writeln(`return ${value.name}?.call(${this.superclass});`, 3);
                } else {
                    this.sb.writeln(`} else if (${this.superclass} is ${value.displayType}) {`, 2);
                    this.sb.writeln(`return ${value.name}?.call(${this.superclass});`, 3);
                }
            }

            this.sb.writeln('} else {', 2);
            this.sb.writeln('throw AssertionError();', 3);
        }

        this.sb.writeln('}', 2);
        this.sb.writeln('}', 1);
    }
}

type MethodType = 'when' | 'maybeWhen' | 'whenOrNull' | 'map' | 'maybeMap' | 'mapOrNull';
