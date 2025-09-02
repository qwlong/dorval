// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'new_pet.f.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$NewPetImpl _$$NewPetImplFromJson(Map<String, dynamic> json) => _$NewPetImpl(
      name: json['name'] as String,
      tag: json['tag'] as String?,
      category: json['category'] == null
          ? null
          : Category.fromJson(json['category'] as Map<String, dynamic>),
      photoUrls: (json['photo_urls'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList(),
      status: json['status'] as String? ?? 'available',
    );

Map<String, dynamic> _$$NewPetImplToJson(_$NewPetImpl instance) =>
    <String, dynamic>{
      'name': instance.name,
      if (instance.tag case final value?) 'tag': value,
      if (instance.category?.toJson() case final value?) 'category': value,
      if (instance.photoUrls case final value?) 'photo_urls': value,
      if (instance.status case final value?) 'status': value,
    };
