import * as vscode from 'vscode';
import { EnumDataGenerator } from '../generators';
import { ElementKind } from '../interface';
import { ClassDataTemplate } from '../templates';
import { identicalCode } from '../utils';
import { DartCodeProvider } from './dart-code-provider';

export class DartEnumDataProvider {
    readonly enum: EnumDataGenerator;

    constructor(private code: DartCodeProvider, private element: ClassDataTemplate) {
        if (element.kind !== ElementKind.enum) {
            console.error('Syntax error due to invalid element type');
        }

        this.enum = new EnumDataGenerator(element);
    }

    extension(): string {
        return new EnumDataGenerator(this.element).writeExtension().generate();
    }

    extensionRange(): vscode.Range | undefined {
        return this.code.findCodeRange(this.extension());
    }

    checkers(): string {
        return new EnumDataGenerator(this.element).writeCheckers().generate();
    }

    checkersAndMethods(): string {
        return '\n' + this.checkers().concat('\n\n', this.methods(), '\n');
    }

    checkersLines(): vscode.TextLine[] {
        return this.code.whereTextLine(this.enum.checkerElements);
    }

    checkersRange() {
        return this.code.rangeFromTextLines(...this.checkersLines());
    }

    methods(): string {
        return new EnumDataGenerator(this.element).writeMethods().generate();
    }

    methodRanges(): vscode.Range[] {
        return this.code.whereCodeBlock(this.enum.methods());
    }

    methodsRange(): vscode.Range | undefined {
        return this.code.mergeRanges(...this.methodRanges());
    }

    get isEmpty(): boolean {
        return this.element.enumMembers.length === 0;
    }

    get hasData(): boolean {
        return this.hasEqualCheckers || this.hasEqualMethods || this.hasEqualExtension;
    }

    get hasEqualCheckers(): boolean {
        return identicalCode(this.checkers(), this.code.getText(this.checkersRange()).replace(/}/g, ''));
    }

    get hasEqualMethods(): boolean {
        return identicalCode(this.enum.methods()[0], this.code.getText(this.methodRanges()[0]))
            && this.enum.methods().length === this.methodRanges().length;
    }

    get hasEqualExtension(): boolean {
        return identicalCode(this.extension(), this.code.getText(this.extensionRange()));
    }
}