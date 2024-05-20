// packages
import { consola } from 'consola';
import tchef from 'tchef';
import type { TchefResult } from 'tchef/dist/src/types';
import { number, object, string, type Output } from 'valibot';

// config
import { ACCESS_TOKEN, STORE_HASH } from './config.ts';

// local
import BcApiChef from './BcApiChef.ts';

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

const bcApi = new BcApiChef(STORE_HASH, ACCESS_TOKEN);

const products = await bcApi.v3().products().getAllProducts();
if (!products.ok) {
    consola.error('Failed to fetch products');
} else {
    consola.success('Successfully fetched products');
    for (const product of products.data) {
        consola.info(product.id);
    }
}
