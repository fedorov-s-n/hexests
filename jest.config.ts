import type {Config} from 'jest';

const config: Config = {
    verbose: true,
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/*.ts'],
    rootDir: 'src/test/ts'
};

export default config;