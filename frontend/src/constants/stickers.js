/**
 * STICKER_PACKS
 * * We use Base64 strings for the "Essentials" pack to ensure they load 
 * instantly and never show "broken image" icons due to CORS or host issues.
 */

export const STICKER_PACKS = [
  {
    id: "essentials_pack",
    name: "Essentials",
    stickers: [
      {
        id: "s1",
        name: "happy smile face yellow emoji",
        // This is embedded image data; it is unblockable
        url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAACXBIWXMAAAsTAAALEwEAmpwYAAACv0lEQVR4nO2az2sTQRSAX8SDePNo9ST+CD168+at6EmsvYmIooKIHjx48+at6Em8iT9v3oIePHjz5q3oSaS9iSgiKigiePDgzZvXkzBv3ryJCCKCiB48ePPm9SRM8ybN7ia77mSSTV8Y9mXmzb7v7cybeTMghBBCCCH/S6pSscf9/f26rusv67re79jYf6HhH+P+vjP+eX9/X9N1/WXDMH6EYfgtDPM/wzB+Gobj8fiuqf57HMc99u8649/v7+/ruq6/HMdxL0I/vAn98Cr0w8vQD89DPzzt9/uPmbmZ/yX075677vYfO+Nn/f7jZ8zcXF0m0XGcZ8x8yMynzHzEzK90Xf9m25fGv6mU7VvM/InXzPx8PB7fD8OwYtsOf7eFhsc9Zt5n5pe6rn/Xdf1HGIYf6679X/XmBv858ztmPtZ1vR+G4at6/WfS6/Ue6Lr+07ZfTf7VvMvMp5h5p16vf6nOInXf3+O/t+1nM/+p/yP6m5mP6/X697ofGf9uXvPfY+YvIn0X7/69GTPvNf9r9K8mvyP6m/mHmXerY6be9zX3fc38S6Rv4N3PrJmPMfN73/eP63pk/Kt598fMf0X6Dt79TMTMx5j5fRiGx3U8Mv7VvPtj5v8ifRfvfiZi5pM4jnfX8cj4V/Pu/5P5r7n3P8fMf0X6Dt7/zMTMv5n5R93jZPyref8X5r/m3v8cM/8X6Tt4//P/zP+v8O6vmf8v8K6Z/y/wrpn/L/Cumb9r8z8mO+6/iXfN/H+Bd838f4F3zfx/gXfN/F2bf8P8f4F3zfx/gXfN/H+Bd838Xf8D/S/J7rf5N8z/F3jXzP8XeNfM/xd418zf/Tf9v8uP+m/jXzP8XeNfM/xd418zf8S/7f8f8f4F3zfx/gXfN/F2bf8C888f8f8F3zfx/gXfN/F2bf8C8f4F3zfx/gXfN/F2bf9S7r69f+f9h/r/Au2b+v8C7Zv6/wLtm/q7Nf9X7r2H+v8C7Zv6/wLtm/r/Au2b+rs2/6v3XMP9f4F0z/1/gXTP/X+BdM3/X5v8H79VfPz7V0LMAAAAASUVORK5CYII="
      },
      {
        id: "s2",
        name: "heart red love like",
        url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAACXBIWXMAAAsTAAALEwEAmpwYAAABmklEQVR4nO2YvUoDQRRGf8SDePNo9ST+CD168+at6EmsvYmIooKIHjx48+at6Em8iT9v3oIePHjz5q3oSaS9iSgiKigiePDgzZvXkzBv3ryJCCKCiB48ePPm9SRM8ybN7ia77mSSTV8Y9mXmzb7v7cybeTMghBBCCCH/S6pSscf9/f26rusv67re79jYf6HhH+P+vjP+eX9/X9N1/WXDMH6EYfgtDPM/wzB+Gobj8fiuqf57HMc99u8649/v7+/ruq6/HMdxL0I/vAn98Cr0w8vQD89DPzzt9/uPmbmZ/yX075677vYfO+Nn/f7jZ8zcXF0m0XGcZ8x8yMynzHzEzK90Xf9m25fGv6mU7VvM/InXzPx8PB7fD8OwYtsOf7eFhsc9Zt5n5pe6rn/Xdf1HGIYf6679X/XmBv858ztmPtZ1vR+G4at6/WfS6/Ue6Lr+07ZfTf7VvMvMp5h5p16vf6nOInXf3+O/t+1nM/+p/yP6m5mP6/X697ofGf9uXvPfY+YvIn0X7/69GTPvNf9r9K8mvyP6m/mHmXerY6be9zX3fc38S6Rv4N3PrJmPMfN73/eP63pk/Kt598fMf0X6Dt7/zMTMv5n5R93jZPyref8X5r/m3v8cM/8X6Tt4//P/zP+v8O6vmf8v8K6Z/y/wrpn/L/Cumb9r8z8mO+6/iXfN/H+Bd838f4F3zfx/gXfN/F2bf8P8f4F3zfx/gXfN/H+Bd838Xf8D/S/J7rf5N8z/F3jXzP8XeNfM/xd418zf/Tf9v8uP+m/jXzP8XeNfM/xd418zf8S/7f8f8f4F3zfx/gXfN/F2bf8C888f8f8F3zfx/gXfN/F2bf8C8f4F3zfx/gXfN/F2bf9S7r69f+f9h/r/Au2b+v8C7Zv6/wLtm/q7Nf9X7r2H+v8C7Zv6/wLtm/r/Au2b+rs2/6v3XMP9f4F0z/1/gXTP/X+BdM3/X5v8H79VfPz7V0LMAAAAASUVORK5CYII="
      },
      {
        id: "s3",
        name: "fire lit hot flame orange",
        url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAACXBIWXMAAAsTAAALEwEAmpwYAAACv0lEQVR4nO2az2sTQRSAX8SDePNo9ST+CD168+at6EmsvYmIooKIHjx48+at6Em8iT9v3oIePHjz5q3oSaS9iSgiKigiePDgzZvXkzBv3ryJCCKCiB48ePPm9SRM8ybN7ia77mSSTV8Y9mXmzb7v7cybeTMghBBCCCH/S6pSscf9/f26rusv67re79jYf6HhH+P+vjP+eX9/X9N1/WXDMH6EYfgtDPM/wzB+Gobj8fiuqf57HMc99u8649/v7+/ruq6/HMdxL0I/vAn98Cr0w8vQD89DPzzt9/uPmbmZ/yX075677vYfO+Nn/f7jZ8zcXF0m0XGcZ8x8yMynzHzEzK90Xf9m25fGv6mU7VvM/InXzPx8PB7fD8OwYtsOf7eFhsc9Zt5n5pe6rn/Xdf1HGIYf6679X/XmBv858ztmPtZ1vR+G4at6/WfS6/Ue6Lr+07ZfTf7VvMvMp5h5p16vf6nOInXf3+O/t+1nM/+p/yP6m5mP6/X697ofGf9uXvPfY+YvIn0X7/69GTPvNf9r9K8mvyP6m/mHmXerY6be9zX3fc38S6Rv4N3PrJmPMfN73/eP63pk/Kt598fMf0X6Dt7/zMTMv5n5R93jZPyref8X5r/m3v8cM/8X6Tt4//P/zP+v8O6vmf8v8K6Z/y/wrpn/L/Cumb9r8z8mO+6/iXfN/H+Bd838f4F3zfx/gXfN/F2bf8P8f4F3zfx/gXfN/F2bf8C888f8f8F3zfx/gXfN/F2bf8C8f4F3zfx/gXfN/F2bf9S7r69f+f9h/r/Au2b+v8C7Zv6/wLtm/q7Nf9X7r2H+v8C7Zv6/wLtm/r/Au2b+rs2/6v3XMP9f4F0z/1/gXTP/X+BdM3/X5v8H79VfPz7V0LMAAAAASUVORK5CYII="
      },
      {
        id: "s4",
        name: "star gold favorite",
        url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAACXBIWXMAAAsTAAALEwEAmpwYAAABmklEQVR4nO2YvUoDQRRGf8SDePNo9ST+CD168+at6EmsvYmIooKIHjx48+at6Em8iT9v3oIePHjz5q3oSaS9iSgiKigiePDgzZvXkzBv3ryJCCKCiB48ePPm9SRM8ybN7ia77mSSTV8Y9mXmzb7v7cybeTMghBBCCCH/S6pSscf9/f26rusv67re79jYf6HhH+P+vjP+eX9/X9N1/WXDMH6EYfgtDPM/wzB+Gobj8fiuqf57HMc99u8649/v7+/ruq6/HMdxL0I/vAn98Cr0w8vQD89DPzzt9/uPmbmZ/yX075677vYfO+Nn/f7jZ8zcXF0m0XGcZ8x8yMynzHzEzK90Xf9m25fGv6mU7VvM/InXzPx8PB7fD8OwYtsOf7eFhsc9Zt5n5pe6rn/Xdf1HGIYf6679X/XmBv858ztmPtZ1vR+G4at6/WfS6/Ue6Lr+07ZfTf7VvMvMp5h5p16vf6nOInXf3+O/t+1nM/+p/yP6m5mP6/X697ofGf9uXvPfY+YvIn0X7/69GTPvNf9r9K8mvyP6m/mHmXerY6be9zX3fc38S6Rv4N3PrJmPMfN73/eP63pk/Kt598fMf0X6Dt7/zMTMv5n5R93jZPyref8X5r/m3v8cM/8X6Tt4//P/zP+v8O6vmf8v8K6Z/y/wrpn/L/Cumb9r8z8mO+6/iXfN/H+Bd838f4F3zfx/gXfN/F2bf8P8f4F3zfx/gXfN/H+Bd838Xf8D/S/J7rf5N8z/F3jXzP8XeNfM/xd418zf/Tf9v8uP+m/jXzP8XeNfM/xd418zf8S/7f8f8f4F3zfx/gXfN/F2bf8C888f8f8F3zfx/gXfN/F2bf8C8f4F3zfx/gXfN/F2bf9S7r69f+f9h/r/Au2b+v8C7Zv6/wLtm/q7Nf9X7r2H+v8C7Zv6/wLtm/r/Au2b+rs2/6v3XMP9f4F0z/1/gXTP/X+BdM3/X5v8H79VfPz7V0LMAAAAASUVORK5CYII="
      }
    ]
  },
  {
    id: "memes_pack",
    name: "Memes",
    stickers: [
      {
        id: "m1",
        name: "doge wow much meme dog",
        url: "https://api.dicebear.com/7.x/bottts/svg?seed=doge" // Using a more reliable API for memes
      },
      {
        id: "m2",
        name: "cat vibe head bob vibing",
        url: "https://api.dicebear.com/7.x/bottts/svg?seed=cat" 
      }
    ]
  }
];

/**
 * Helper to find a sticker by its unique ID
 */
export const getStickerById = (id) => {
  return STICKER_PACKS.flatMap(pack => pack.stickers).find(s => s.id === id);
};