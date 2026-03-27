export function authorize(providedKey: string | null): boolean{
        const expectedKey: string | undefined = process.env.API_KEY;
    
        if (expectedKey) {
            if (!providedKey) {
                console.error('[API_KEY Authorisation]:No API_KEY provided');
                return false;
            }
    
            if (providedKey !== expectedKey) {
                console.error('[API_KEY Authorisation]:Invalid API_KEY provided');
                return false;
            }
        } else {
            console.warn('[API_KEY Authorisation]:No server API_KEY set');
            return false;
        }

        return true;
}

export function getIntersection<T>(...arrays: T[][]): T[] {
    if (arrays.length === 0) {
        return [];
    }

    return arrays.reduce((acc, curr) => {
        return acc.filter(item => curr.includes(item));
    });
}