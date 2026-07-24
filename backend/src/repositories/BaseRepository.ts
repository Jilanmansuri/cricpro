import { Model, Document, FilterQuery, UpdateQuery, PopulateOptions, ClientSession } from 'mongoose';

export class BaseRepository<T extends Document> {
  protected model: Model<T>;

  constructor(model: Model<T>) {
    this.model = model;
  }

  async create(item: Partial<T> | any, session?: ClientSession): Promise<T> {
    const createdItem = new this.model(item);
    const result = await createdItem.save({ session });
    return result as T;
  }

  async find(
    filter: FilterQuery<T> = {},
    options: {
      page?: number;
      limit?: number;
      sort?: any;
      populate?: string | PopulateOptions | (string | PopulateOptions)[];
      session?: ClientSession;
    } = {}
  ): Promise<T[]> {
    const query = this.model.find(filter).session(options.session || null);

    if (options.sort) {
      query.sort(options.sort);
    }

    if (options.page && options.limit) {
      const skip = (options.page - 1) * options.limit;
      query.skip(skip).limit(options.limit);
    }

    if (options.populate) {
      query.populate(options.populate as any);
    }

    return await query.exec();
  }

  async findOne(
    filter: FilterQuery<T>,
    populate?: string | PopulateOptions | (string | PopulateOptions)[],
    session?: ClientSession
  ): Promise<T | null> {
    const query = this.model.findOne(filter).session(session || null);
    if (populate) {
      query.populate(populate as any);
    }
    return await query.exec();
  }

  async findById(
    id: string | any,
    populate?: string | PopulateOptions | (string | PopulateOptions)[],
    session?: ClientSession
  ): Promise<T | null> {
    const query = this.model.findById(id).session(session || null);
    if (populate) {
      query.populate(populate as any);
    }
    return await query.exec();
  }

  async update(id: string | any, item: UpdateQuery<T>, session?: ClientSession): Promise<T | null> {
    return await this.model.findByIdAndUpdate(id, item, { new: true, runValidators: true, session }).exec();
  }

  async updateOne(filter: FilterQuery<T>, item: UpdateQuery<T>, session?: ClientSession, upsert: boolean = false): Promise<T | null> {
    return await this.model.findOneAndUpdate(filter, item, { new: true, runValidators: true, upsert, session }).exec();
  }

  async updateMany(filter: FilterQuery<T>, update: UpdateQuery<T>, session?: ClientSession): Promise<any> {
    return await this.model.updateMany(filter, update, { session }).exec();
  }

  async delete(id: string | any, session?: ClientSession): Promise<T | null> {
    return await this.model.findByIdAndDelete(id, { session }).exec();
  }

  async deleteMany(filter: FilterQuery<T>, session?: ClientSession): Promise<any> {
    return await this.model.deleteMany(filter, { session }).exec();
  }

  async count(filter: FilterQuery<T> = {}, session?: ClientSession): Promise<number> {
    return await this.model.countDocuments(filter).session(session || null).exec();
  }
}
export default BaseRepository;
