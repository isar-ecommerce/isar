export interface DistrictData {
  name: string;
  upazilas: string[];
}

export interface DivisionData {
  name: string;
  districts: DistrictData[];
}

export const BANGLADESH_DIVISIONS: DivisionData[] = [
  {
    name: 'Dhaka',
    districts: [
      {
        name: 'Dhaka',
        upazilas: ['Dhanmondi', 'Mirpur', 'Gulshan', 'Banani', 'Uttara', 'Mohammadpur', 'Badda', 'Motijheel', 'Old Dhaka', 'Savar', 'Dhamrai', 'Keraniganj', 'Jatrabari', 'Tejgaon', 'Khilgaon', 'Pallabi', 'Rampura', 'Ashulia'],
      },
      {
        name: 'Gazipur',
        upazilas: ['Gazipur Sadar', 'Kaliakair', 'Kapasia', 'Sreepur', 'Kaliganj', 'Tongi'],
      },
      {
        name: 'Narayanganj',
        upazilas: ['Narayanganj Sadar', 'Araihazar', 'Bandar', 'Rupganj', 'Sonargaon'],
      },
      {
        name: 'Tangail',
        upazilas: ['Tangail Sadar', 'Basail', 'Bhuapur', 'Delduar', 'Ghatail', 'Gopalpur', 'Kalihati', 'Madhupur', 'Mirzapur', 'Nagarpur', 'Sakhipur'],
      },
      {
        name: 'Narsingdi',
        upazilas: ['Narsingdi Sadar', 'Belabo', 'Monohardi', 'Palash', 'Raipura', 'Shibpur'],
      },
      {
        name: 'Munshiganj',
        upazilas: ['Munshiganj Sadar', 'Gazaria', 'Lohajang', 'Sirajdikhan', 'Sreenagar', 'Tongibari'],
      },
      {
        name: 'Manikganj',
        upazilas: ['Manikganj Sadar', 'Daulatpur', 'Ghior', 'Harirampur', 'Saturia', 'Shivalaya', 'Singair'],
      },
      {
        name: 'Faridpur',
        upazilas: ['Faridpur Sadar', 'Alfadanga', 'Bhanga', 'Boalmari', 'Charbhadrasan', 'Madhukhali', 'Nagarkanda', 'Sadarpur', 'Saltha'],
      },
      {
        name: 'Gopalganj',
        upazilas: ['Gopalganj Sadar', 'Kashiani', 'Kotalipara', 'Muksudpur', 'Tungipara'],
      },
      {
        name: 'Madaripur',
        upazilas: ['Madaripur Sadar', 'Kalkini', 'Rajoir', 'Shibchar'],
      },
      {
        name: 'Rajbari',
        upazilas: ['Rajbari Sadar', 'Baliakandi', 'Goalandaghat', 'Pangsha', 'Kalukhali'],
      },
      {
        name: 'Shariatpur',
        upazilas: ['Shariatpur Sadar', 'Bhedarganj', 'Damudya', 'Gosairhat', 'Naria', 'Zajira'],
      },
      {
        name: 'Kishoreganj',
        upazilas: ['Kishoreganj Sadar', 'Austagram', 'Bajitpur', 'Bhairab', 'Hossainpur', 'Itna', 'Karimganj', 'Katiadi', 'Kuliarchar', 'Mithamain', 'Nikli', 'Pakundia', 'Tarail'],
      },
    ],
  },
  {
    name: 'Chittagong',
    districts: [
      {
        name: 'Chittagong',
        upazilas: ['Kotwali', 'Panchlaish', 'Pahartali', 'Halishahar', 'Agrabad', 'Khulshi', 'Bakalia', 'Hathazari', 'Sitakunda', 'Mirsharai', 'Patiya', 'Boalkhali', 'Anwara', 'Chandanaish', 'Fatikchhari', 'Rangunia', 'Raozan', 'Sandwip', 'Satkania', 'Lohagara', 'Banshkhali'],
      },
      {
        name: 'Cox\'s Bazar',
        upazilas: ['Cox\'s Bazar Sadar', 'Chakaria', 'Kutubdia', 'Maheshkhali', 'Ramu', 'Teknaf', 'Ukhia', 'Pekua'],
      },
      {
        name: 'Cumilla',
        upazilas: ['Cumilla Sadar', 'Barura', 'Brahmanpara', 'Burichang', 'Chandina', 'Chauddagram', 'Daudkandi', 'Debidwar', 'Homna', 'Laksam', 'Muradnagar', 'Nangalkot', 'Titas', 'Meghna', 'Monohargonj'],
      },
      {
        name: 'Feni',
        upazilas: ['Feni Sadar', 'Chhagalnaiya', 'Daganbhuiyan', 'Parshuram', 'Fulgazi', 'Sonagazi'],
      },
      {
        name: 'Brahmanbaria',
        upazilas: ['Brahmanbaria Sadar', 'Ashuganj', 'Akhaura', 'Bancharampur', 'Bijoynagar', 'Kasba', 'Nabinagar', 'Nasirnagar', 'Sarail'],
      },
      {
        name: 'Noakhali',
        upazilas: ['Noakhali Sadar', 'Begumganj', 'Chatkhil', 'Companiganj', 'Hatiya', 'Senbagh', 'Sonaimuri', 'Subarnachar', 'Kabirhat'],
      },
      {
        name: 'Lakshmipur',
        upazilas: ['Lakshmipur Sadar', 'Raipur', 'Ramganj', 'Ramgati', 'Kamalnagar'],
      },
      {
        name: 'Chandpur',
        upazilas: ['Chandpur Sadar', 'Faridganj', 'Haimchar', 'Haziganj', 'Kachua', 'Matlab North', 'Matlab South', 'Shahrasti'],
      },
      {
        name: 'Rangamati',
        upazilas: ['Rangamati Sadar', 'Baghaichhari', 'Barkal', 'Belaichhari', 'Juraichhari', 'Kaptai', 'Kawkhali', 'Langadu', 'Naniarchar', 'Rajasthali'],
      },
      {
        name: 'Khagrachhari',
        upazilas: ['Khagrachhari Sadar', 'Dighinala', 'Lakshmichhari', 'Mahalchhari', 'Manikchhari', 'Matiranga', 'Panchhari', 'Ramgarh'],
      },
      {
        name: 'Bandarban',
        upazilas: ['Bandarban Sadar', 'Ali Kadam', 'Lama', 'Naikhongchhari', 'Rowangchhari', 'Ruma', 'Thanchi'],
      },
    ],
  },
  {
    name: 'Rajshahi',
    districts: [
      {
        name: 'Rajshahi',
        upazilas: ['Boalia', 'Motihar', 'Rajpara', 'Shah Makhdum', 'Godagari', 'Tanore', 'Mohanpur', 'Bagmara', 'Durgapur', 'Bagha', 'Charghat', 'Puthia'],
      },
      {
        name: 'Bogura',
        upazilas: ['Bogura Sadar', 'Adamdighi', 'Dhunat', 'Dhupchanchia', 'Gabtali', 'Kahaloo', 'Nandigram', 'Sariakandi', 'Shajahanpur', 'Sherpur', 'Shibganj', 'Sonatala'],
      },
      {
        name: 'Pabna',
        upazilas: ['Pabna Sadar', 'Atgharia', 'Bera', 'Bhangura', 'Chatmohar', 'Faridpur', 'Ishwardi', 'Santhia', 'Sujanagar'],
      },
      {
        name: 'Sirajganj',
        upazilas: ['Sirajganj Sadar', 'Belkuchi', 'Chauhali', 'Kamarkhanda', 'Kazipur', 'Raiganj', 'Shahjadpur', 'Tarash', 'Ullapara'],
      },
      {
        name: 'Naogaon',
        upazilas: ['Naogaon Sadar', 'Atrai', 'Badalgachhi', 'Dhamoirhat', 'Manda', 'Mohadevpur', 'Niamatpur', 'Patnitala', 'Porsha', 'Raninagar', 'Sapahar'],
      },
      {
        name: 'Natore',
        upazilas: ['Natore Sadar', 'Bagatipara', 'Baraigram', 'Gurudaspur', 'Lalpur', 'Singra', 'Naldanga'],
      },
      {
        name: 'Chapainawabganj',
        upazilas: ['Chapainawabganj Sadar', 'Bholahat', 'Gomastapur', 'Nachole', 'Shibganj'],
      },
      {
        name: 'Joypurhat',
        upazilas: ['Joypurhat Sadar', 'Akkelpur', 'Kalai', 'Khetlal', 'Panchbibi'],
      },
    ],
  },
  {
    name: 'Khulna',
    districts: [
      {
        name: 'Khulna',
        upazilas: ['Khulna Sadar', 'Batiaghata', 'Dacope', 'Dumuria', 'Dighalia', 'Koyra', 'Paikgachha', 'Phultala', 'Rupsha', 'Terokhada'],
      },
      {
        name: 'Jashore',
        upazilas: ['Jashore Sadar', 'Abhaynagar', 'Bagherpara', 'Chaugachha', 'Jhikargachha', 'Keshabpur', 'Manirampur', 'Sharsha'],
      },
      {
        name: 'Satkhira',
        upazilas: ['Satkhira Sadar', 'Assasuni', 'Debhata', 'Kalaroa', 'Kaliganj', 'Shyamnagar', 'Tala'],
      },
      {
        name: 'Kushtia',
        upazilas: ['Kushtia Sadar', 'Bheramara', 'Daulatpur', 'Khoksa', 'Kumarkhali', 'Mirpur'],
      },
      {
        name: 'Bagerhat',
        upazilas: ['Bagerhat Sadar', 'Chitalmari', 'Fakirhat', 'Kachua', 'Mollahat', 'Mongla', 'Morrelganj', 'Rampal', 'Sarankhola'],
      },
      {
        name: 'Jhenaidah',
        upazilas: ['Jhenaidah Sadar', 'Harinakunda', 'Kaliganj', 'Kotchandpur', 'Maheshpur', 'Shailkupa'],
      },
      {
        name: 'Chuadanga',
        upazilas: ['Chuadanga Sadar', 'Alamdanga', 'Damurhuda', 'Jibannagar'],
      },
      {
        name: 'Meherpur',
        upazilas: ['Meherpur Sadar', 'Gangni', 'Mujibnagar'],
      },
      {
        name: 'Magura',
        upazilas: ['Magura Sadar', 'Mohammadpur', 'Shalikha', 'Sreepur'],
      },
      {
        name: 'Narail',
        upazilas: ['Narail Sadar', 'Kalia', 'Lohagara'],
      },
    ],
  },
  {
    name: 'Barisal',
    districts: [
      {
        name: 'Barisal',
        upazilas: ['Barisal Sadar', 'Agailjhara', 'Babuganj', 'Bakerganj', 'Banaripara', 'Gaurnadi', 'Hizla', 'Mehendiganj', 'Muladi', 'Wazirpur'],
      },
      {
        name: 'Patuakhali',
        upazilas: ['Patuakhali Sadar', 'Bauphal', 'Dashmina', 'Galachipa', 'Kalapara', 'Mirzaganj', 'Dumki', 'Rangabali'],
      },
      {
        name: 'Bhola',
        upazilas: ['Bhola Sadar', 'Burhanuddin', 'Char Fasson', 'Daulatkhan', 'Lalmohan', 'Manpura', 'Tazumuddin'],
      },
      {
        name: 'Pirojpur',
        upazilas: ['Pirojpur Sadar', 'Bhandaria', 'Kawkhali', 'Mathbaria', 'Nazirpur', 'Nesarabad (Swarupkati)', 'Zianagar'],
      },
      {
        name: 'Barguna',
        upazilas: ['Barguna Sadar', 'Amtali', 'Bamna', 'Betagi', 'Patharghata', 'Taltali'],
      },
      {
        name: 'Jhalokathi',
        upazilas: ['Jhalokathi Sadar', 'Kathalia', 'Nalchity', 'Rajapur'],
      },
    ],
  },
  {
    name: 'Sylhet',
    districts: [
      {
        name: 'Sylhet',
        upazilas: ['Sylhet Sadar', 'Beanibazar', 'Bishwanath', 'Companiganj', 'Dakshin Surma', 'Fenchuganj', 'Golapganj', 'Gowainghat', 'Jaintiapur', 'Kanaighat', 'Osmani Nagar', 'Zakiganj'],
      },
      {
        name: 'Moulvibazar',
        upazilas: ['Moulvibazar Sadar', 'Barlekha', 'Juri', 'Kamalganj', 'Kulaura', 'Rajnagar', 'Sreemangal'],
      },
      {
        name: 'Habiganj',
        upazilas: ['Habiganj Sadar', 'Ajmiriganj', 'Bahubal', 'Baniyachong', 'Chunarughat', 'Lakhai', 'Madhabpur', 'Nabiganj', 'Sayestaganj'],
      },
      {
        name: 'Sunamganj',
        upazilas: ['Sunamganj Sadar', 'Bishwamvarpur', 'Chhatak', 'Derai', 'Dharampasha', 'Dowarabazar', 'Jagannathpur', 'Jamalganj', 'Shantiganj', 'Sullah', 'Tahirpur'],
      },
    ],
  },
  {
    name: 'Rangpur',
    districts: [
      {
        name: 'Rangpur',
        upazilas: ['Rangpur Sadar', 'Badarganj', 'Gangachhara', 'Kaunia', 'Mithapukur', 'Pirgachha', 'Pirganj', 'Taraganj'],
      },
      {
        name: 'Dinajpur',
        upazilas: ['Dinajpur Sadar', 'Birampur', 'Birganj', 'Biral', 'Bochaganj', 'Chirirbandar', 'Fulbari', 'Ghoraghat', 'Hakimpur', 'Kaharole', 'Khansama', 'Nawabganj', 'Parbatipur'],
      },
      {
        name: 'Gaibandha',
        upazilas: ['Gaibandha Sadar', 'Fulchhari', 'Gobindaganj', 'Palashbari', 'Sadullapur', 'Saghata', 'Sundarganj'],
      },
      {
        name: 'Kurigram',
        upazilas: ['Kurigram Sadar', 'Bhurungamari', 'Char Rajibpur', 'Chilmari', 'Phulbari', 'Nageshwari', 'Rajarhat', 'Raomari', 'Ulipur'],
      },
      {
        name: 'Nilphamari',
        upazilas: ['Nilphamari Sadar', 'Dimla', 'Domar', 'Jaldhaka', 'Kishoreganj', 'Saidpur'],
      },
      {
        name: 'Lalmonirhat',
        upazilas: ['Lalmonirhat Sadar', 'Aditmari', 'Hatibandha', 'Kaliganj', 'Patgram'],
      },
      {
        name: 'Panchagarh',
        upazilas: ['Panchagarh Sadar', 'Atwari', 'Boda', 'Debiganj', 'Tetulia'],
      },
      {
        name: 'Thakurgaon',
        upazilas: ['Thakurgaon Sadar', 'Baliadangi', 'Haripur', 'Pirganj', 'Ranisankail'],
      },
    ],
  },
  {
    name: 'Mymensingh',
    districts: [
      {
        name: 'Mymensingh',
        upazilas: ['Mymensingh Sadar', 'Bhaluka', 'Dhobaura', 'Fulbaria', 'Gafargaon', 'Gauripur', 'Haluaghat', 'Ishwarganj', 'Muktagachha', 'Nandail', 'Phulpur', 'Tara Khanda'],
      },
      {
        name: 'Jamalpur',
        upazilas: ['Jamalpur Sadar', 'Baksiganj', 'Dewanganj', 'Islampur', 'Madarganj', 'Melandaha', 'Sarishabari'],
      },
      {
        name: 'Netrokona',
        upazilas: ['Netrokona Sadar', 'Atpara', 'Barhatta', 'Durgapur', 'Kalmakanda', 'Kendua', 'Madan', 'Mohanganj', 'Purbadhala'],
      },
      {
        name: 'Sherpur',
        upazilas: ['Sherpur Sadar', 'Jhenaigati', 'Nakla', 'Nalitabari', 'Sreebardi'],
      },
    ],
  },
];

/**
 * নির্বাচিত বিভাগের সব জেলা পাওয়ার ফাংশন
 */
export const getDistrictsByDivision = (divisionName: string): DistrictData[] => {
  const division = BANGLADESH_DIVISIONS.find(
    (d) => d.name.toLowerCase() === divisionName.toLowerCase()
  );
  return division ? division.districts : BANGLADESH_DIVISIONS[0].districts;
};

/**
 * নির্বাচিত জেলার সব উপজেলা/থানা পাওয়ার ফাংশন
 */
export const getUpazilasByDistrict = (
  divisionName: string,
  districtName: string
): string[] => {
  const districts = getDistrictsByDivision(divisionName);
  const district = districts.find(
    (d) => d.name.toLowerCase() === districtName.toLowerCase()
  );
  return district ? district.upazilas : [];
};