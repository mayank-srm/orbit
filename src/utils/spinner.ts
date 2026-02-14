import ora from 'ora';
import { logger } from './logger.js';

export interface SpinnerLike {
    text: string;
    start(): SpinnerLike;
    stop(): SpinnerLike;
    succeed(text?: string): SpinnerLike;
    fail(text?: string): SpinnerLike;
}

class NoopSpinner implements SpinnerLike {
    text: string;

    constructor(text: string) {
        this.text = text;
    }

    start(): SpinnerLike {
        return this;
    }

    stop(): SpinnerLike {
        return this;
    }

    succeed(text?: string): SpinnerLike {
        logger.success(text ?? this.text);
        return this;
    }

    fail(text?: string): SpinnerLike {
        logger.error(text ?? this.text);
        return this;
    }
}

export const createSpinner = (text: string): SpinnerLike => {
    if (logger.isJsonMode()) {
        return new NoopSpinner(text);
    }
    return ora(text).start();
};
