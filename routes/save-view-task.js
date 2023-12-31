const express = require("express");
const path = require('path');
const fs = require('fs')
const db = require(__dirname + "/../modules/mysql2");
const router = express.Router();
const previewInitImg = require(__dirname + "/../modules/itinerary-img-preview");
const multipartParser = previewInitImg.none();
const photoDirectory = path.join(__dirname, '../public/img/view-img')

router.get("/", async (req, res) => {
  const itin_member = req.query.itin_member;
  // console.log('itin_member=>',itin_member)
  const sql=`SELECT m.member_name,m.images,d.*, i.name AS itin_name,i.date,i.coverPhoto,i.itin_member_id,i.note,i.ppl,DATE_FORMAT(i.time,'%H:%i') AS time FROM itinerary AS i LEFT JOIN itinerary_details AS d ON d.itin_id = i.itin_id LEFT JOIN member AS m ON m.member_id=i.itin_member_id where i.itin_id=? ORDER BY d.itin_order ASC`;
  // console.log(sql)
  const [rows] = await db.query(sql,[itin_member]);
  // console.log('result intin_id=>',rows)
  return res.json(rows);
});


router.post("/", multipartParser, async (req, res) => {
  const data = req.body;
  //如果data不是真的或者data不是個陣列
  if (!data || !Array.isArray(data)) {
    return res.status(400).json({ error: '無效的請求數據' });
  }

    // 取得 itin_id
    const itin_id = data[0].itin_id;

    // 刪除原有的行程資料
    const deleteSql = `DELETE FROM itinerary_details WHERE itin_id=?`;
    await db.query(deleteSql, [itin_id]);

    // 在資料庫中逐個儲存陣列物件
    // const insertSql = `
    //   INSERT INTO \`itinerary_details\`
    //   (\`itin_id\`, \`itin_order\`, \`formatted_address\`, \`lat\`, \`lng\`, \`name\`, \`phone_number\`, \`weekday_text\`, \`startdatetime\`, \`create_at\`)
    //   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    // `;
    const insertSql =
    "INSERT INTO `itinerary_details` " +
      "(`itin_id`, `itin_order`, `formatted_address`, `lat`, `lng`, `name`, `phone_number`,`photo_url`, `weekday_text`, `startdatetime`,`create_at`) " +
      "VALUES (?,?,?,?,?,?,?,?,?,?,NOW())";


     // 在資料庫中逐個儲存陣列物件
    const insertPromises=data.map(item=>{

      const values = [
        item.itin_id,
        item.itin_order,
        item.formatted_address,
        item.lat,
        item.lng,
        item.name,
        item.phone_number,
        item.photo_url,
        '"'+item.weekday_text+'"',
        item.startdatetime
      ];
      return db.query(insertSql, values);
    })

    try {
      // 使用 Promise.all 來等待所有的新增操作完成後才會解析
      // Promise.all 方法接收一個Promise物件陣列作為參數
      await Promise.all(insertPromises);
      console.log('資料儲存成功！');
      res.json({ success: true });
    } catch (error) {
      console.error('資料儲存失敗', error);
    }
});


//編輯
router.get("/edit", async (req, res) => {
  const itin_member = req.query.itin_member;
  console.log('itin_member=>',itin_member)

  const sql=`SELECT * FROM itinerary_details WHERE itin_id=? ORDER BY itin_order ASC`;
  const [rows] = await db.query(sql,[itin_member]);
  return res.json(rows);

})


router.get("/photos/:photoName",(req,res)=>{

  const photoName=req.params.photoName;
  const photoPath=path.join(photoDirectory, photoName);
  if(fs.existsSync(photoPath)){
    fs.readFile(photoPath,(err,data)=>{
      if(err){
        console.log('照片讀取失敗',err);
      return res.status(500).json({error:'照片讀取失敗'})
     }
     res.setHeader('Content-Type', 'image/jpg');
     res.end(data)
     console.log('照片讀取成功',data)//讀取照片二進位內容
    })
  } else{
    res.status(404).json({error:'找不到照片'})
  }
})



module.exports = router;
