class RegExpManager {
    /** 
     * Check if it matches the angle brackets bloc `<...>`
     * and guarantees that it is not empty and matches the allowed type.
     * - To get generic without brackets use group 1.
     */
    readonly genericType = /<(\D+)>/;

    /** 
     * Checks if it matches the parentheses block `(...)`.
     * - To get parameters without parentheses use group 1.
     */
    readonly constructorMatch = /\((.*)\)/;

    /** 
     * Checks if it matches the part import Uri.
     * - To get file name use group 1.
     */
    readonly part = /^\s*part '([^0-9A-Z][a-z0-9_]+.part.dart)';\s*$/;

    /**
     * Checks if the line starts with `enum`.
     * @example '// enum'
     */
    readonly enumComment = /^\s*\/{2,}\s*enum\s*$/;

    /**
     * Checks if the line contains `enum` and has provided enums types.
     *  - To get a enums use group 1.
     * @example 'enum(Status, Error)'
     */
    readonly specificEnumComment = /s*enum\(([A-Z_$][a-zA-Z0-9_,\s]+)\)\s*/;

    /**
     * Checks if the line starts with annotation JSON key.
     * - To get a parameters use group 1.
     * @example '@JsonKey(name: 'key')'
     */
    readonly jsonKeyAnnotation = /\s*@JsonKey\(([a-z]+:\s*.*)\)\s*/;

    /**
     * Checks if the line contains annotations.
     * @example '@..........)'
     */
    readonly anyAnnotation = /\s*@.*\)\s*/;

    /**
     * Checks json key name in the json key annotation.
     * - To get key use group 1.
     * @example name: 'key'
     */
    readonly jsonKeyName = /name:\s*'(.*)'/;

    /**
     * Checks if the line has commented JSON key.
     * - To get key use group 1.
     * @example 'jsonKey(key)'
     */
    readonly jsonKeyComment = /\s*jsonKey\((\w+)\)\s*/;

    /** 
     * Checks if multiple values in the same line with the same type.
     * - To get a modifier use group 1.
     * - To get a type use group 2.
     * - To get a generic types or null check use group 3.
     * - To check if is it nullable type use group 4.
     * - To get values use group 5.
     */
    readonly multipleValuesInline = /^(final\s+|\s*)(\D\w+)(<\D+>\s+|<\D+>\?\s+|\?\s+|\s+)([a-z_$]+\w*(\s*=.*|\s*),\s+[a-z_$]+(\s*=.*|\s*).*)/;

    /**
     * Captures everything between `.` and `(` ex: `.name(`.
     * - To get `name` use group 2.
     */
    readonly namedConstructorName = /(\s+[A-Z_]|^[A-Z_])\w+\.([a-z][a-zA-Z0-9]*)\(/;

    /** Checks that the field value is privately marked with the underscore `_*` or `._()` and `._internal()`. */
    readonly privacy = /\w+\s+_[a-zA-z]\w+|\._(\(|\w+\().*\)/;

    /** Checks if the line is a comment. */
    readonly comment = /\/{2,}.*|\/\*.*|^\s*\*.*/gm;

    /** 
     * Checks if the line starts with a comment.
     * @example '//' or '//////'
     */
    readonly startOfComment = /^\s*\/{2,}\s*/;

    /** Checks if matches the abstract class */
    readonly abstractClass = /^\s*abstract\s+class\s+[A-Z_]\w+/;

    /** Checks if matches class */
    readonly classMatch = /^\s*(abstract\s+class\s+|class\s+|enum\s+)([A-Z_$][A-Za-z0-9_$]+)(.*{.*$|^}$|.*}$)/;

    /** 
     * Checks if it matches the subclass.
     * - To get a subclass name use group 1.
     * - To get a generic type use group 2.
     */
    readonly subclassMatch = /=\s+([A-Z_]\w*)(<\D+>|\s*)/;

    /** 
     * Checks if string matches object variable.
     * - To get a modifier use group 1.
     * - To get a type use group 2.
     * - To get a generic types use group 3.
     * - To check if is it nullable type use group 4.
     * - To get a value name use group 5.
     */
    readonly variableMatch = /(^final\s+|^\s*)([_$]*[A-Z][a-zA-Z0-9_]+)(<.*>|\S)(\?\s+|\s+)([a-z_][a-zA-Z0-9_]+)$/;

    /** 
     * Checks if value is primitive.
     * - To get a modifier use group 1.
     * - To get a type use group 2.
     * - To check if is it nullable type use group 3.
     * - To get a value name use group 4.
     */
    readonly primitiveValue = /(^final\s+|^\s*)(String|bool|num|int|double|dynamic|Object)(\?\s+|\s+)([_$]+\w+|[a-z]\w+)(\s*;|\s*)$/;

    /** 
     * Checks if value is function type.
     * - To get a modifier use group 1.
     * - To get a type use group 2.
     * - To get generics use group 3.
     * - To check if is it nullable type use group 4.
     * - To get a value name use group 5.
     */
    readonly functionType = /(^final\s+|\s*)([A-Za-z0-9_$]+(<\D+>\s+|\s+)Function\(.*\))(\?\s+|\s+)([a-z_$]+\w)/;

    /**
     * Checks if variable is getter.
     */
    readonly getterMatch = /^[^0-9][a-zA-Z0-9_$<>]+(\?\s+|\s+)+get\s+[a-z_$][a-zA-Z0-9_$]+(\s*|\s*;)$/;

    /** Combine several RegExp into one. */
    readonly combine = (...regexes: RegExp[]): RegExp => {
        return new RegExp(regexes.map((e) => e.source).join('|'), 'g');
    };
}

export const regexp = new RegExpManager();