import { Range, TextLine } from 'vscode';
import pubspec from '../../shared/pubspec';
import '../../types/string';
import { CodeReader } from '../code-reader';

export class DartLibraries {
    private buffer: Map<TextLine, Range> = new Map();
    readonly external: TextLine[] = [];
    readonly imports: TextLine[] = [];

    constructor(reader: CodeReader) {
        this.read(reader);
    }

    get local(): TextLine[] {
        return [...this.buffer.keys()].filter((line) => this.isLocalLibrary(line));
    }

    contains(line: TextLine): boolean {
        const text = line.text.trimStart();
        if (text.startsWith('import ')) return true;
        if (text.startsWith('part ')) return true;
        return false;
    }

    private isLocalLibrary(line: TextLine): boolean {
        if (line.text.indexOf('package:') !== -1 && line.text.indexOf(`${pubspec.projectName}/`) === -1) return false;
        if (line.text.indexOf('dart:') !== -1) return false;
        return true;
    }

    private read(reader: CodeReader) {
        for (const line of reader.lines) {
            if (line.isEmptyOrWhitespace) continue;

            if (this.contains(line)) {
                const fullRange = reader.rangeWhere(line.range.start, (e) => e.text.trimEnd().endsWith(';'));

                if (fullRange !== undefined) {
                    this.buffer.set(line, fullRange);
                    continue;
                }
            }

            // Libraries can be only on the top of the code. Stop the task on the first code line match.
            if (line.firstNonWhitespaceCharacterIndex !== 0 && !this.contains(line)) break;
        }
    }
}