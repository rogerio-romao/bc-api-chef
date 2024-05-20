// packages
import { consola } from 'consola';
import tchef from 'tchef';
import type { TchefResult } from 'tchef/dist/src/types';
import { number, object, string, type Output } from 'valibot';

const TodoSchema = object({
    userId: number(),
    id: number(),
    title: string(),
    body: string(),
});

type Todo = Output<typeof TodoSchema>;

export default async function fetchTodo(): Promise<TchefResult<Todo>> {
    const res = await tchef<Todo>(
        'https://jsonplaceholder.typicode.com/posts/1',
        {
            validateSchema: TodoSchema,
        }
    );

    if (!res.ok) {
        consola.error('Failed to fetch todo');
        return res;
    }
    consola.success('Successfully fetched todo');
    return res;
}
