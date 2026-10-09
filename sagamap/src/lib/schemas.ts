import { z } from "zod";
import { CATEGORIES } from "./config";

const optionalUrl = z
  .string()
  .trim()
  .url("URL の形式が正しくありません")
  .refine((u) => /^https?:\/\//.test(u), "http(s) の URL を入力してください")
  .or(z.literal(""))
  .nullish();

export const storeFields = {
  name: z.string().trim().min(1, "店舗名は必須です").max(100),
  address: z.string().trim().min(1, "住所は必須です").max(200),
  serviceDescription: z.string().trim().max(1000).default(""),
  contact: z.string().trim().max(100).default(""),
  category: z.enum(CATEGORIES),
  priceLevel: z.coerce.number().int().min(1).max(3).default(2),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
};

export const businessRegisterSchema = z.object({
  ...storeFields,
  inviteCode: z.string().trim().max(40).optional(),
  email: z.string().trim().toLowerCase().email("メールアドレスの形式が正しくありません"),
  password: z.string().min(8, "パスワードは 8 文字以上にしてください").max(128),
});

export const storeCreateSchema = z.object(storeFields);

export const storeUpdateSchema = z
  .object({
    ...storeFields,
    crowdLevel: z.coerce.number().int().min(1).max(5),
    instagramUrl: optionalUrl,
    twitterUrl: optionalUrl,
  })
  .partial();

export const customerRegisterSchema = z.object({
  name: z.string().trim().min(1, "名前は必須です").max(50),
  email: z.string().trim().toLowerCase().email("メールアドレスの形式が正しくありません"),
  password: z.string().min(8, "パスワードは 8 文字以上にしてください").max(128),
  interests: z.array(z.enum(CATEGORIES)).default([]),
  ref: z.coerce.number().int().positive().optional(),
  notifyEnabled: z.boolean().default(true),
});

export const couponCreateSchema = z.object({
  businessId: z.coerce.number().int().positive(),
  title: z.string().trim().min(1, "タイトルは必須です").max(100),
  discountRate: z.coerce.number().int().min(1, "割引率は 1〜100% です").max(100, "割引率は 1〜100% です"),
  conditions: z.string().trim().max(300).default(""),
  expiresAt: z.coerce.date().refine((d) => d.getTime() > Date.now(), "有効期限は未来の日時にしてください"),
  notify: z.boolean().default(true),
});

export const adCreateSchema = z.object({
  businessId: z.coerce.number().int().positive(),
  headline: z.string().trim().min(1, "見出しは必須です").max(60),
  body: z.string().trim().max(120).default(""),
  days: z.coerce.number().int().min(1).max(90).default(30),
  notify: z.boolean().default(true),
});
