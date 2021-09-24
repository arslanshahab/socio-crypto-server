import {
    PrimaryGeneratedColumn,
    Entity,
    BaseEntity,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    Column,
} from "typeorm";
import { Campaign } from "./Campaign";

@Entity()
export class CampaignMedia extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    public id: string;

    @Column({ nullable: true })
    public channel: string;

    @Column({ nullable: true })
    public media: string;

    @Column({ nullable: true })
    public mediaFormat: string;

    @Column({ nullable: true })
    public isDefault: boolean;

    @ManyToOne((_type) => Campaign, (campaign) => campaign.campaignMedia)
    public campaign: Campaign;

    @CreateDateColumn()
    public createdAt: Date;

    @UpdateDateColumn()
    public updatedAt: Date;

    public asV1(): CampaignMedia {
        return {
            ...this,
            campaign: this.campaign.asV1(),
        };
    }

    public static async saveMedias(list: any, campaign: Campaign): Promise<CampaignMedia[]> {
        let templates: CampaignMedia[] = [];
        list.forEach((item: any) => {
            let order = new CampaignMedia();
            order.channel = item.channel;
            order.media = item.media;
            order.mediaFormat = item.mediaFormat;
            order.isDefault = item.isDefault;
            order.campaign = campaign;
            templates.push(order);
        });
        return await CampaignMedia.save(templates);
    }
}
