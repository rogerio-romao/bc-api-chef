import { expect, test } from 'vitest';
import fetchTodo from '../index.ts';

test('fetchTodo should return a valid todo', async () => {
    const res = await fetchTodo();
    expect(res.ok).toBe(true);
    if (!res.ok) {
        expect(res.error).toBe('Failed to fetch todo');
        return;
    }
    expect(res.data.userId).toBe(1);
    expect(res.data.id).toBe(1);
    expect(res.data.title).toBe(
        'sunt aut facere repellat provident occaecati excepturi optio reprehenderit'
    );
    expect(res.data.body).toBe(
        'quia et suscipit\nsuscipit recusandae consequuntur expedita et cum\nreprehenderit molestiae ut ut quas totam\nnostrum rerum est autem sunt rem eveniet architecto'
    );
});
