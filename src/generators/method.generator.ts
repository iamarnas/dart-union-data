import { ActionValue } from '../interface';
import { ClassDataTemplate } from '../templates';

class MehodGenerator implements ActionValue {
    constructor(element: ClassDataTemplate) { }

    get key(): string {
        throw new Error('Method not implemented.');
    }

    get value(): string {
        throw new Error('Method not implemented.');
    }

    get insertion(): string {
        throw new Error('Method not implemented.');
    }
}