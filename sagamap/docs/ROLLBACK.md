# 復旧手順（元に戻す方法）

本番（https://www.saga-kanko-map.com）に問題が出たときに、**前の状態に戻す**ための手順です。
データベース（お客さま・お店・クーポンなどのデータ）は、どちらの方法でも**そのまま残ります**（コードだけを戻します）。

## いちばん速い方法：Vercel の「Instant Rollback」（オーナーが 1 分で実行できる）

1. https://vercel.com にログインし、このサイトのプロジェクトを開く
2. 上のメニューの **Deployments** を開く
3. 一覧から、問題が出る前の **Production** のデプロイ（緑の「Ready」）を探す
   - Next.js 16 に更新する前のものは、コミットの説明が「セキュリティ：next-auth を 4.24.15 に更新・使っていない画像最適化を停止」のもの
4. 右の「…」→ **Instant Rollback**（または **Promote to Production**）を押す
5. 1 分ほどで、本番が前の状態に戻ります

※ この方法はコードを書き換えないので、あとで Claude が「戻した状態」をコードにも反映します（下の方法）。

## コードごと戻す方法（Claude・自動保守が実行する）

戻したい時点のコミット（下の表）の `sagamap/` を既定ブランチに入れ直して push すると、Vercel が自動でその状態を公開します。

```sh
# 既定ブランチ（本番）を取り出す
git fetch origin claude/zealous-fermi-7iQ0C
git worktree add /tmp/rollback origin/claude/zealous-fermi-7iQ0C
cd /tmp/rollback && git checkout -B claude/zealous-fermi-7iQ0C
# 戻したい時点の sagamap/ に置き換える（例：Next.js 16 に更新する前）
rm -rf sagamap && git checkout f158a2ed7273011d4479e71eb4a4db30b7bffd2f -- sagamap
git commit -am "復旧：Next.js 16 更新前の状態に戻す" && git push origin claude/zealous-fermi-7iQ0C
```

開発ブランチ（claude/sagamap-mvp-oddfol）も同じ時点に戻す場合は、開発ブランチで `git checkout 2872c1b9b460aeb8ddd8a423fba9122e69554bd3 -- sagamap` をしてコミットする（履歴は消さない・force push はしない）。

## 戻せる時点の記録

| 時点 | 本番（既定ブランチ）のコミット | 開発ブランチのコミット |
|---|---|---|
| Next.js 16 に更新する前（Next.js 14.2.35・next-auth 4.24.15） | `f158a2ed7273011d4479e71eb4a4db30b7bffd2f` | `2872c1b9b460aeb8ddd8a423fba9122e69554bd3` |

- 更新の前後でデータベースの構造は変えていないため、どちらのコードでも同じデータで動きます。
- 戻した直後に古い画面が出るときは、ブラウザを再読み込みしてください。
