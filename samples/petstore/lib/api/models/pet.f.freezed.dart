// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'pet.f.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

Pet _$PetFromJson(Map<String, dynamic> json) {
  return _Pet.fromJson(json);
}

/// @nodoc
mixin _$Pet {
  /// Name of the pet
  String get name => throw _privateConstructorUsedError;

  /// Type of pet
  String? get tag => throw _privateConstructorUsedError;
  Category? get category => throw _privateConstructorUsedError;

  /// Image URLs
  List<String>? get photoUrls => throw _privateConstructorUsedError;

  /// pet status in the store
  String? get status => throw _privateConstructorUsedError;

  /// Unique id of the pet
  int get id => throw _privateConstructorUsedError;

  /// Serializes this Pet to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of Pet
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $PetCopyWith<Pet> get copyWith => throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $PetCopyWith<$Res> {
  factory $PetCopyWith(Pet value, $Res Function(Pet) then) =
      _$PetCopyWithImpl<$Res, Pet>;
  @useResult
  $Res call(
      {String name,
      String? tag,
      Category? category,
      List<String>? photoUrls,
      String? status,
      int id});

  $CategoryCopyWith<$Res>? get category;
}

/// @nodoc
class _$PetCopyWithImpl<$Res, $Val extends Pet> implements $PetCopyWith<$Res> {
  _$PetCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of Pet
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? name = null,
    Object? tag = freezed,
    Object? category = freezed,
    Object? photoUrls = freezed,
    Object? status = freezed,
    Object? id = null,
  }) {
    return _then(_value.copyWith(
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      tag: freezed == tag
          ? _value.tag
          : tag // ignore: cast_nullable_to_non_nullable
              as String?,
      category: freezed == category
          ? _value.category
          : category // ignore: cast_nullable_to_non_nullable
              as Category?,
      photoUrls: freezed == photoUrls
          ? _value.photoUrls
          : photoUrls // ignore: cast_nullable_to_non_nullable
              as List<String>?,
      status: freezed == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String?,
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as int,
    ) as $Val);
  }

  /// Create a copy of Pet
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $CategoryCopyWith<$Res>? get category {
    if (_value.category == null) {
      return null;
    }

    return $CategoryCopyWith<$Res>(_value.category!, (value) {
      return _then(_value.copyWith(category: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$PetImplCopyWith<$Res> implements $PetCopyWith<$Res> {
  factory _$$PetImplCopyWith(_$PetImpl value, $Res Function(_$PetImpl) then) =
      __$$PetImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String name,
      String? tag,
      Category? category,
      List<String>? photoUrls,
      String? status,
      int id});

  @override
  $CategoryCopyWith<$Res>? get category;
}

/// @nodoc
class __$$PetImplCopyWithImpl<$Res> extends _$PetCopyWithImpl<$Res, _$PetImpl>
    implements _$$PetImplCopyWith<$Res> {
  __$$PetImplCopyWithImpl(_$PetImpl _value, $Res Function(_$PetImpl) _then)
      : super(_value, _then);

  /// Create a copy of Pet
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? name = null,
    Object? tag = freezed,
    Object? category = freezed,
    Object? photoUrls = freezed,
    Object? status = freezed,
    Object? id = null,
  }) {
    return _then(_$PetImpl(
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      tag: freezed == tag
          ? _value.tag
          : tag // ignore: cast_nullable_to_non_nullable
              as String?,
      category: freezed == category
          ? _value.category
          : category // ignore: cast_nullable_to_non_nullable
              as Category?,
      photoUrls: freezed == photoUrls
          ? _value._photoUrls
          : photoUrls // ignore: cast_nullable_to_non_nullable
              as List<String>?,
      status: freezed == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String?,
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as int,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$PetImpl implements _Pet {
  const _$PetImpl(
      {required this.name,
      this.tag,
      this.category,
      final List<String>? photoUrls,
      this.status = 'available',
      required this.id})
      : _photoUrls = photoUrls;

  factory _$PetImpl.fromJson(Map<String, dynamic> json) =>
      _$$PetImplFromJson(json);

  /// Name of the pet
  @override
  final String name;

  /// Type of pet
  @override
  final String? tag;
  @override
  final Category? category;

  /// Image URLs
  final List<String>? _photoUrls;

  /// Image URLs
  @override
  List<String>? get photoUrls {
    final value = _photoUrls;
    if (value == null) return null;
    if (_photoUrls is EqualUnmodifiableListView) return _photoUrls;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(value);
  }

  /// pet status in the store
  @override
  @JsonKey()
  final String? status;

  /// Unique id of the pet
  @override
  final int id;

  @override
  String toString() {
    return 'Pet(name: $name, tag: $tag, category: $category, photoUrls: $photoUrls, status: $status, id: $id)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$PetImpl &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.tag, tag) || other.tag == tag) &&
            (identical(other.category, category) ||
                other.category == category) &&
            const DeepCollectionEquality()
                .equals(other._photoUrls, _photoUrls) &&
            (identical(other.status, status) || other.status == status) &&
            (identical(other.id, id) || other.id == id));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, name, tag, category,
      const DeepCollectionEquality().hash(_photoUrls), status, id);

  /// Create a copy of Pet
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$PetImplCopyWith<_$PetImpl> get copyWith =>
      __$$PetImplCopyWithImpl<_$PetImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$PetImplToJson(
      this,
    );
  }
}

abstract class _Pet implements Pet {
  const factory _Pet(
      {required final String name,
      final String? tag,
      final Category? category,
      final List<String>? photoUrls,
      final String? status,
      required final int id}) = _$PetImpl;

  factory _Pet.fromJson(Map<String, dynamic> json) = _$PetImpl.fromJson;

  /// Name of the pet
  @override
  String get name;

  /// Type of pet
  @override
  String? get tag;
  @override
  Category? get category;

  /// Image URLs
  @override
  List<String>? get photoUrls;

  /// pet status in the store
  @override
  String? get status;

  /// Unique id of the pet
  @override
  int get id;

  /// Create a copy of Pet
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$PetImplCopyWith<_$PetImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
