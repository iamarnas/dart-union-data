class RegExpManager {
    /** 
     * Check if it matches the angle brackets bloc `<...>`
     * and guarantees that it is not empty and matches the allowed type.
     * 
     * To get generic without brackets use group 1.
     */
    readonly genericsMatch = /\<(\D+)\>/;

    /** 
     * Checks if it matches the parentheses block `(...)`.
     * 
     * To get parameters without parentheses use group 1.
     */
    readonly paramsMatch = /\((.*)\)/;

    /**
     * Captures everything between `.` and `(` ex: `.name(`.
     * 
     * - To get `name` use group 2.
     */
    readonly namedConstructorNameMatch = /(\s+[A-Z_]|^[A-Z_])\w+\.([a-z][a-zA-Z0-9]*)\(/;

    /** Checks that the field value is privately marked with the underscore `_*` or `._()`. */
    readonly privacyMatch = /\w+\s+_[a-zA-z]\w+|\._\(.*\)/;

    /** Checks if the line is a comment. */
    readonly commentsMatch = /(\/.*)|(\*.*)/g;

    /** Checks if matches the abstract class */
    readonly abstractClassMatch = /^\s*abstract\s+class\s+[A-Z_]\w+/;

    /** Checks if matches the factory constructor. */
    readonly factoryMatch = /factory\s+[A-Z_]\w*\.[a-z]\w*\(.*\)/;

    readonly classMatch = /^\s*(abstract\s+class\s+|class\s+|enum\s+)([A-Z_$][A-Za-z0-9_$]+)(.*{.*$|^}$|.*}$)/;

    /** 
     * Checks if it matches the subclass.
     * 
     * - To get a subclass name use group 1.
     * - To get a generic type use group 2.
     */
    readonly subclassMatch = /=\s+([A-Z_]\w*)(\<\D+\>|\s*)/;

    /** Combine several RegExp into one. */
    readonly combine = (...regexes: RegExp[]): RegExp => {
        return new RegExp(regexes.map((e) => e.source).join('|'), 'g');
    };
}

export const regexp = new RegExpManager();