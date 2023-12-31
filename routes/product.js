const express = require("express");
const db = require(__dirname + "/../modules/mysql2");
const dayjs = require("dayjs");
const router = express.Router();
const upload = require(__dirname + "/../modules/img-upload");
const multipartParser = upload.none();
const app = express();

router.get("/", async (req, res) => {
  let output = {
    redirect: "",
    totalRows: 0,
    perPage: 25,
    totalPages: 0,
    page: 1,
    rows: [],
  };
  const perPage = 9;
  let keyword = req.query.keyword || "";
  let page = req.query.page ? parseInt(req.query.page) : 1;

  let category = req.query.category
    ? req.query.category != "all"
      ? ` AND product_category LIKE "%${req.query.category}%"`
      : ""
    : "";
  let order = "";
  switch (req.query.order) {
    case "AtoZ":
      order = `ORDER BY product_price`;
      break;
    case "ZtoA":
      order = `ORDER BY product_price DESC`;
      break;
    case "rating":
      order = `ORDER BY product_rate DESC`;
      break;
  }

  if (!page || page < 1) {
    output.redirect = req.baseUrl;
    return res.json(output);
  }

  let where = " WHERE 1 ";
  if (keyword) {
    const kw_escaped = db.escape("%" + keyword + "%");
    where += ` AND ( 
          product_name LIKE ${kw_escaped} 
          )
        `;
  }

  const t_sql = `SELECT COUNT(1) totalRows FROM products ${where} ${category} ${order}`;
  const [[{ totalRows }]] = await db.query(t_sql);
  let totalPages = 0;
  let rows = [];
  if (totalRows) {
    totalPages = Math.ceil(totalRows / perPage);
    if (page > totalPages) {
      output.redirect = req.baseUrl + "?page=" + totalPages;
      return res.json(output);
    }

    const sql = ` SELECT * FROM products ${where} ${category} ${order} LIMIT ${
      perPage * (page - 1)
    }, ${perPage}`;
    [rows] = await db.query(sql);
  }
  output = { ...output, totalRows, perPage, totalPages, page, rows, keyword };
  return res.json(output);
});
router.post("/findCollection", async (req, res) => {
  let output = {
    redirect: "",
    totalRows: 0,
    perPage: 25,
    totalPages: 0,
    page: 1,
    rows: [],
  };
  const perPage = 9;
  let keyword = req.body.keyword;
  let page = req.query.page ? parseInt(req.query.page) : 1;

  if (!page || page < 1) {
    output.redirect = req.baseUrl;
    return res.json(output);
  }

  let where = " WHERE 1 ";
  if (keyword) {
    const kw_escaped = db.escape("%" + keyword + "%");
    where += ` AND ( 
          product_name LIKE ${kw_escaped} 

          )
        `;
  }

  const t_sql = `SELECT COUNT(1) AS totalRows FROM products INNER JOIN product_collection ON products.product_id = product_collection.product_id ${where} AND product_collection.member_id="${req.body.memberID}"`;
  const [[{ totalRows }]] = await db.query(t_sql);
  let totalPages = 0;
  let rows = [];

  if (totalRows) {
    totalPages = Math.ceil(totalRows / perPage);
    if (page > totalPages) {
      output.redirect = req.baseUrl + "?page=" + totalPages;
      return res.json(output);
    }

    const sql = ` SELECT * FROM products INNER JOIN product_collection ON products.product_id = product_collection.product_id ${where} AND product_collection.member_id="${
      req.body.memberID
    }" LIMIT ${perPage * (page - 1)}, ${perPage}`;
    [rows] = await db.query(sql);
  }
  output = { ...output, totalRows, perPage, totalPages, page, rows, keyword };
  return res.json(output);
});

router.post("/findBuyagain", async (req, res) => {
  let output = {
    redirect: "",
    totalRows: 0,
    perPage: 25,
    totalPages: 0,
    page: 1,
    rows: [],
  };
  const perPage = 9;
  let keyword = req.body.keyword;
  let page = req.query.page ? parseInt(req.query.page) : 1;

  if (!page || page < 1) {
    output.redirect = req.baseUrl;
    return res.json(output);
  }

  let where = " WHERE 1 ";
  if (keyword) {
    const kw_escaped = db.escape("%" + keyword + "%");
    where += ` AND ( 
         product_name LIKE ${kw_escaped} 

          )
        `;
  }

  const t_sql = `SELECT COUNT(1) AS totalRows FROM products INNER JOIN (SELECT product_id, member_id FROM product_checking_item GROUP BY product_id, member_id) AS product_checking_item ON products.product_id = product_checking_item.product_id ${where} AND product_checking_item.member_id=${req.body.memberID}`;

  const [[{ totalRows }]] = await db.query(t_sql);
  let totalPages = 0;
  let rows = [];

  if (totalRows) {
    totalPages = Math.ceil(totalRows / perPage);
    if (page > totalPages) {
      output.redirect = req.baseUrl + "?page=" + totalPages;
      return res.json(output);
    }

    const sql = ` SELECT * FROM products
    INNER JOIN (SELECT product_id, member_id FROM product_checking_item GROUP BY product_id, member_id) AS product_checking_item ON products.product_id = product_checking_item.product_id ${where} AND product_checking_item.member_id=${
      req.body.memberID
    } LIMIT ${perPage * (page - 1)}, ${perPage}`;
    [rows] = await db.query(sql);
  }
  output = { ...output, totalRows, perPage, totalPages, page, rows, keyword };
  return res.json(output);
});

router.post("/cart/read", async (req, res) => {
  const { member_id } = req.body.auth; // req.body.auth.member_id 可縮短成 member_id
  const checkAll_sql = `UPDATE cart SET cart_check = ${true} WHERE member_id = ${member_id}`;
  const [rows1] = await db.query(checkAll_sql);
  const selectPriceAll_sql = `SELECT cart.*, products.* FROM cart INNER JOIN products ON cart.product_id = products.product_id WHERE member_id=${member_id} ORDER BY cart.cart_created ASC`;
  const [rowsSelectPriceAll] = await db.query(selectPriceAll_sql);
  let totalPrice = 0.0;
  if (rowsSelectPriceAll.length > 0) {
    rowsSelectPriceAll.forEach((e, i) => {
      if (rowsSelectPriceAll[i].cart_check == true) {
        totalPrice +=
          parseInt(rowsSelectPriceAll[i].product_num) *
          parseInt(rowsSelectPriceAll[i].product_price);
      }
    });
    const setTotalPrice_sql = `UPDATE cart SET cart_total = ${totalPrice} WHERE member_id = ${member_id}`;
    const [rowsSetTotalPrice] = await db.query(setTotalPrice_sql);
    const cart_sql = `SELECT cart.*, products.* FROM cart INNER JOIN products ON cart.product_id = products.product_id WHERE member_id=${member_id} ORDER BY cart.cart_created ASC`;
    let [rows5] = await db.query(cart_sql);
    res.json({ all: rows5 });
  } else if (rowsSelectPriceAll.length == 0) {
    res.json({ all: [] });
  }
});

router.post("/cart/change", async (req, res) => {
  let product_num = req.body.value;
  if (!req.body.value) {
    product_num = 0;
  }
  const product_id = req.body.name;
  const member_id = req.body.member;
  const cart_check = req.body.check;
  const cart_all_check = req.body.allCheck;
  const [rows] = [];
  if (req.body.value != undefined) {
    const cart_change_sql = `UPDATE cart SET product_num = ${product_num} WHERE member_id = ${member_id} AND product_id = ${product_id}`;
    const [rows] = await db.query(cart_change_sql);
  } else if (req.body.check != undefined) {
    const cart_change_sql = `UPDATE cart SET cart_check = ${cart_check} WHERE member_id = ${member_id} AND product_id = ${product_id}`;
    const [rows] = await db.query(cart_change_sql);
  } else if (req.body.allCheck != undefined) {
    const cart_change_sql = `UPDATE cart SET cart_check = ${cart_all_check} WHERE member_id = ${member_id}`;
    const [rows] = await db.query(cart_change_sql);
  }
  const selectPriceAll_sql = `SELECT cart.product_num,cart.product_id, cart.cart_total,cart.cart_check, products.product_id, products.product_price FROM cart INNER JOIN products ON cart.product_id = products.product_id WHERE member_id=${member_id} ORDER BY cart.cart_created ASC`;
  const [rowsSelectPriceAll] = await db.query(selectPriceAll_sql);
  let totalPrice = 0.0;
  if (rowsSelectPriceAll.length > 0) {
    rowsSelectPriceAll.forEach((e, i) => {
      if (rowsSelectPriceAll[i].cart_check == true) {
        totalPrice +=
          parseInt(rowsSelectPriceAll[i].product_num) *
          parseInt(rowsSelectPriceAll[i].product_price);
      }
    });
    const setTotalPrice_sql = `UPDATE cart SET cart_total = ${totalPrice} WHERE member_id = ${member_id}`;
    const [rowsSetTotalPrice] = await db.query(setTotalPrice_sql);
    const cart_sql = `SELECT cart.product_id, cart.member_id, cart.product_num, cart.cart_created, cart.cart_total, products.product_id, products.product_name, products.product_price, products.product_brief, products.product_main_img FROM cart INNER JOIN products ON cart.product_id = products.product_id WHERE member_id=${member_id} ORDER BY cart.cart_created ASC`;
    const [rows5] = await db.query(cart_sql);
    res.json({ all: rows5 });
  }
});
router.post("/cart/delete", async (req, res) => {
  const member_id = req.body.member;
  const product_id = req.body.product;
  const delete_all = req.body.deleteAll;
  let cart_delete_sql = `DELETE FROM cart WHERE member_id = ${member_id} AND product_id = ${product_id}`;
  if (delete_all == true) {
    cart_delete_sql = `DELETE FROM cart WHERE member_id = ${member_id}`;
  }
  const [rows] = await db.query(cart_delete_sql);
  const selectPriceAll_sql = `SELECT cart.product_num,cart.product_id, cart.cart_total,cart.cart_check, products.product_id, products.product_price FROM cart INNER JOIN products ON cart.product_id = products.product_id WHERE member_id=${member_id} ORDER BY cart.cart_created ASC`;
  const [rowsSelectPriceAll] = await db.query(selectPriceAll_sql);
  let totalPrice = 0.0;
  if (rowsSelectPriceAll.length > -1) {
    rowsSelectPriceAll.forEach((e, i) => {
      if (rowsSelectPriceAll[i].cart_check == true) {
        totalPrice +=
          parseInt(rowsSelectPriceAll[i].product_num) *
          parseInt(rowsSelectPriceAll[i].product_price);
      }
    });
    const setTotalPrice_sql = `UPDATE cart SET cart_total = ${totalPrice} WHERE member_id = ${member_id}`;
    const [rowsSetTotalPrice] = await db.query(setTotalPrice_sql);
    const cart_sql = `SELECT cart.product_id, cart.member_id, cart.product_num, cart.cart_created, cart.cart_total, products.product_id, products.product_name, products.product_price, products.product_brief, products.product_main_img FROM cart INNER JOIN products ON cart.product_id = products.product_id WHERE member_id=${member_id} ORDER BY cart.cart_created ASC`;
    const [rows5] = await db.query(cart_sql);
    res.json({ all: rows5 });
  }
});
router.post("/cart/add", async (req, res) => {
  const output = {};
  const member_id = req.body.member;
  const product_id = req.body.productID;
  const product_in_num = req.body.productNum;
  const cart_add_sql = `SELECT * FROM cart WHERE member_id = ${member_id} AND product_id = ${product_id}`;
  const [rows] = await db.query(cart_add_sql);
  const now = dayjs(new Date());
  if (rows.length > 0) {
    //原本購物車就有此商品，修改數量
    let product_change_num =
      parseInt(product_in_num) + parseInt(rows[0].product_num);
    if (product_change_num < 1) {
      product_change_num = 1;
    }
    const cart_editNum = `UPDATE cart
    SET product_num = ${product_change_num}
    WHERE member_id = ${member_id} AND product_id = ${product_id}`;
    const [rows1] = await db.query(cart_editNum);
  } else {
    //原本購物車沒有此商品，新增商品
    const cart_addItem = `INSERT INTO cart (member_id, product_id, product_num)
    VALUES (${member_id}, ${product_id}, ${product_in_num})`;
    const [rows2] = await db.query(cart_addItem);
  }

  const selectPriceAll_sql = `SELECT cart.product_num,cart.product_id, cart.cart_total,cart.cart_check, products.product_id, products.product_price FROM cart INNER JOIN products ON cart.product_id = products.product_id WHERE member_id=${member_id} ORDER BY cart.cart_created ASC`;
  const [rowsSelectPriceAll] = await db.query(selectPriceAll_sql);
  let totalPrice = 0.0;
  if (rowsSelectPriceAll.length > 0) {
    rowsSelectPriceAll.forEach((e, i) => {
      if (rowsSelectPriceAll[i].cart_check == true) {
        totalPrice +=
          parseInt(rowsSelectPriceAll[i].product_num) *
          parseInt(rowsSelectPriceAll[i].product_price);
      }
    });
    const setTotalPrice_sql = `UPDATE cart SET cart_total = ${totalPrice} WHERE member_id = ${member_id}`;
    const [rowsSetTotalPrice] = await db.query(setTotalPrice_sql);
    const cart_sql = `SELECT cart.product_id, cart.member_id, cart.product_num, cart.cart_created, cart.cart_total, products.product_id, products.product_name, products.product_price, products.product_brief, products.product_main_img FROM cart INNER JOIN products ON cart.product_id = products.product_id WHERE member_id=${member_id} ORDER BY cart.cart_created ASC`;
    const [rows5] = await db.query(cart_sql);
    res.json({ all: rows5 });
  }
});
router.get("/:product_post", async (req, res) => {
  const output = {
    success: false,
    error: "",
    row: null,
  };
  const product_post_value = req.params.product_post;
  if (!product_post_value) {
    // 沒有 sid
    output.error = req.params.product_post;
  } else {
    // alert(product_post);
    const p_sql = `SELECT * FROM products WHERE product_post='${product_post_value}'`;
    const [rows] = await db.query(p_sql);

    if (rows.length) {
      output.success = true;
      output.row = rows[0];
    } else {
      // 沒有資料
      output.error = "沒有資料!";
    }
  }
  return res.json(output);
});

router.post("/cart/checking", async (req, res) => {
  let checkingAdd_rows = [];
  const member_id = req.body.member;
  const checkingSelect_sql = `SELECT cart.*, member.* ,products.* FROM cart
  INNER JOIN products ON cart.product_id = products.product_id
  INNER JOIN member ON cart.member_id = member.member_id WHERE cart.member_id=${member_id} AND cart.cart_check=${true} `;
  const [checkingSelect_rows] = await db.query(checkingSelect_sql);
  const timestamp = new Date().getTime();
  let batch =
    Math.random().toString(36).substring(2, 8) + timestamp.toString(36);
  checkingSelect_rows.forEach(async (e, i) => {
    let checkingAdd_sql = `INSERT INTO product_checking_item (member_id, product_id, product_num, checking_total, order_id)
    VALUES (${e.member_id}, ${e.product_id}, ${e.product_num}, ${e.cart_total}, '${batch}')`;
    [checkingAdd_rows] = await db.query(checkingAdd_sql);
  });
  res.json({ all: checkingSelect_rows, Batch: batch });
});
/**/
module.exports = router;
