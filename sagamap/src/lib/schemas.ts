import { z } from "zod";
import { AMENITIES, CATEGORIES, PAYMENT_ITEMS, PAYMENT_KEYS } from "./config";
import { COUPON_TYPES } from "./coupon";

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
    threadsUrl: optionalUrl,
    facebookUrl: optionalUrl,
    businessHours: z.string().trim().max(100),
    closedDays: z.string().trim().max(100),
    amenities: z.array(z.enum(AMENITIES)).max(AMENITIES.length),
    paymentMethods: z.array(z.enum(PAYMENT_ITEMS)).max(PAYMENT_ITEMS.length),
    paymentNone: z.array(z.enum(PAYMENT_KEYS)).max(PAYMENT_KEYS.length),
    websiteUrl: optionalUrl,
    reservationUrl: optionalUrl,
    // LINE は URL のほか「@abc1234」（LINE ID）でも入れられる
    lineUrl: z.preprocess(
      (v) => (typeof v === "string" && /^@[\w.\-]{2,40}$/.test(v.trim()) ? `https://line.me/R/ti/p/${encodeURIComponent(v.trim())}` : v),
      optionalUrl,
    ),
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

const optionalInt = (min: number, max: number, msg: string) =>
  z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce.number().int().min(min, msg).max(max, msg).optional(),
  ) as unknown as z.ZodOptional<z.ZodNumber>;

export const couponCreateSchema = z
  .object({
    businessId: z.coerce.number().int().positive(),
    title: z.string().trim().min(1, "タイトルは必須です").max(100),
    couponType: z.enum(COUPON_TYPES).default("percent"),
    discountRate: optionalInt(1, 100, "割引率は 1〜100% です"),
    amountYen: optionalInt(1, 1_000_000, "値引きの金額は 1〜1,000,000 円です"),
    specialPrice: optionalInt(0, 1_000_000, "特別価格は 0〜1,000,000 円です"),
    regularPrice: optionalInt(1, 1_000_000, "通常価格は 1〜1,000,000 円です"),
    benefit: z.string().trim().max(60).default(""),
    conditions: z.string().trim().max(300).default(""),
    expiresAt: z.coerce.date().refine((d) => d.getTime() > Date.now(), "有効期限は未来の日時にしてください"),
    maxUses: optionalInt(1, 100_000, "先着の人数は 1 人以上にしてください"),
    repeatable: z.boolean().default(false),
    firstVisitOnly: z.boolean().default(false),
    notify: z.boolean().default(true),
    /** クーポン画像（任意）。JPEG を base64 にしたもの（最大 1.5MB） */
    imageBase64: z.string().max(2_100_000, "画像は 1.5MB 以下にしてください").optional(),
  })
  .superRefine((d, ctx) => {
    const need = (ok: unknown, path: string, message: string) => {
      if (!ok) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
    };
    if (d.couponType === "percent") need(d.discountRate, "discountRate", "割引率を入れてください");
    if (d.couponType === "yen") need(d.amountYen, "amountYen", "値引きの金額を入れてください");
    if (d.couponType === "price") {
      need(d.specialPrice != null, "specialPrice", "特別価格を入れてください");
      if (d.regularPrice != null && d.specialPrice != null) need(d.specialPrice < d.regularPrice, "specialPrice", "特別価格は通常価格より安くしてください");
    }
    if (d.couponType === "gift") need(d.benefit, "benefit", "特典の内容を入れてください（例：トッピング 1 品無料）");
  });

export const adCreateSchema = z.object({
  businessId: z.coerce.number().int().positive(),
  headline: z.string().trim().min(1, "見出しは必須です").max(60),
  body: z.string().trim().max(120).default(""),
  days: z.coerce.number().int().min(1).max(90).default(30),
  notify: z.boolean().default(true),
  /** 広告画像（任意）。JPEG を base64 にしたもの（最大 1.5MB） */
  imageBase64: z.string().max(2_100_000, "画像は 1.5MB 以下にしてください").optional(),
});
