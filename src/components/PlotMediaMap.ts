import cornImg from '../assets/images/plot_phetchabun_corn_1794623567718.jpg';
import riceImg from '../assets/images/plot_surin_rice_1794623567241.jpg';
import sugarcaneImg from '../assets/images/plot_suphan_sugarcane_1794623568082.jpg';

export const PLOT_MEDIA_MAP: Record<string, { src: string; alt: string }> = {
  'plot-phetchabun-corn': {
    src: cornImg,
    alt: 'ภาพมุมสูงแปลงข้าวโพดเลี้ยงสัตว์ อำเภอหนองไผ่ จังหวัดเพชรบูรณ์',
  },
  'plot-surin-rice': {
    src: riceImg,
    alt: 'ภาพมุมสูงแปลงนาข้าวหอมมะลิ อำเภอเมือง จังหวัดสุรินทร์',
  },
  'plot-suphan-sugarcane': {
    src: sugarcaneImg,
    alt: 'ภาพมุมสูงแปลงอ้อยโรงงาน อำเภอด่านช้าง จังหวัดสุพรรณบุรี',
  },
};
