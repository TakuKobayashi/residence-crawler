import models from '../../sequelize/models';

export async function resetAutoIncrementSequence(tableName: string): Promise<void> {
  const dialect: string = models.sequelize.options.dialect;
  if (dialect === 'mysql') {
    await models.sequelize.query(`ALTER TABLE \`${tableName}\` auto_increment = 1;`);
  } else if (dialect === 'postgres') {
    await models.sequelize.query(`ALTER SEQUENCE ${tableName}_id_seq RESTART WITH 1;`);
  }
}
