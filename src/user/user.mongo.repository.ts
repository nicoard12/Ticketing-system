import { Inject, Injectable } from "@nestjs/common";
import { Model } from "mongoose";
import { User } from "src/interfaces/user.interface";

@Injectable()
export class UserMongoRepository {
  constructor(
    @Inject('USER_MODEL')
    private readonly userModel: Model<User>,
  ) {}

  async create(data: Partial<User>): Promise<User> {
    const user = new this.userModel(data);
    return user.save();
  }

  async findByAuthId(idAuth: string): Promise<User | null> {
    return this.userModel.findOne({ idAuth }).exec();
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find().exec();
  }

  async updateRole(user: User, rol: string): Promise<User> {
    user.set({ rol });
    return await user.save()
  }
}
