import * as Knex from "knex";


export async function up(knex: Knex): Promise<void> {
    return knex.schema.createTable('users', (table: Knex.TableBuilder) => {
        table.increments('id').primary().unsigned();
        table.string('user',30).notNullable();
        table.string('pass').notNullable();
        table.string('email',50).notNullable();
        table.date('accountexpiration').notNullable();
        table.date('passexpiration').notNullable();
        table.string('aut');
        table.boolean('emailconfirmed').notNullable();
      });
}


export async function down(knex: Knex): Promise<void> {
    return knex.schema.dropTable('users');
}

