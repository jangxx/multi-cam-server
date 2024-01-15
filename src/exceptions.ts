export abstract class GenericError extends Error {
	public readonly httpCode: number;
	public readonly isCustomError = true;

	constructor(message: string, httpCode: number) {
		super(message);

		this.httpCode = httpCode;
	}
}

export class NotFoundError extends GenericError {
	constructor(entityName: string) {
		super(`${entityName} not found`, 404);
	}
}

export class InternalError extends GenericError {
	constructor(message: string) {
		super(message, 500);
	}
}