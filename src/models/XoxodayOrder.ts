import {
    PrimaryGeneratedColumn,
    Entity,
    BaseEntity,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    Column,
} from "typeorm";
import { User } from "./User";

@Entity()
export class XoxodayOrder extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    public id: string;

    @Column({ nullable: false })
    public xoxodayOrderId: string;

    @Column({ nullable: false })
    public orderTotal: string;

    @Column({ nullable: false })
    public currencyCode: string;

    @Column({ nullable: false })
    public coiinPrice: string;

    @Column({ nullable: false })
    public poNumber: string;

    @Column({ nullable: false })
    public productId: string;

    @Column({ nullable: false })
    public quantity: number;

    @Column({ nullable: false })
    public denomination: number;

    @ManyToOne((_type) => User, (user) => user.orders)
    public user: User;

    @CreateDateColumn()
    public createdAt: Date;

    @UpdateDateColumn()
    public updatedAt: Date;

    public asV1(): XoxodayOrder {
        return {
            ...this,
        };
    }

    public static async saveOrderList(list: any, user: User): Promise<XoxodayOrder[]> {
        let orders: XoxodayOrder[] = [];
        list.forEach((item: any) => {
            let order = new XoxodayOrder();
            order.xoxodayOrderId = item.orderId;
            order.orderTotal = item.orderTotal;
            order.currencyCode = item.currencyCode;
            order.coiinPrice = item.coiinPrice;
            order.poNumber = item.poNumber;
            order.productId = item.productId;
            order.quantity = item.quantity;
            order.denomination = item.denomination;
            order.user = user;
            orders.push(order);
        });
        return await XoxodayOrder.save(orders);
    }
}
