import { withPrevious } from '$lib/stores/withPrevious';
import { get } from 'svelte/store';

describe('withPrevious', () => {
    const curr = withPrevious(0);

    it('initial state', () => {
        expect(get(curr)).toBe(0);
        expect(curr.getPrevious()).toBe(null);
    });

    const tests: Array<{
        newValue: number;
        expected: [number, number | null];
    }> = [
        { newValue: 1, expected: [1, 0] },
        { newValue: 2, expected: [2, 1] },
        { newValue: 3, expected: [3, 2] },
        { newValue: 40, expected: [40, 3] },
        { newValue: 0, expected: [0, 40] },
        { newValue: 0, expected: [0, 0] }
    ];

    tests.forEach(({ newValue, expected }) => {
        it(`should return ${expected} for ${newValue}`, () => {
            curr.set(newValue);
            expect(get(curr)).toBe(expected[0]);
            expect(curr.getPrevious()).toBe(expected[1]);
        });
    });
});
